import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatus } from '@common/enums/order-status.enum';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    private readonly dataSource: DataSource,
    private readonly cartService: CartService,
    private readonly inventoryService: InventoryService,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * CREATE ORDER
   * -------------------------------------------------------
   * 🔴 EXTENSION POINT:
   * - Coupons
   * - Shipping calculation
   * - Payment intent creation
   */
  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const cart = await this.cartService.getCart(userId);

      if (!cart.items.length) {
        throw new ConflictException('Cart is empty');
      }

      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      for (const cartItem of cart.items) {
        const product = await this.productsService.findOne(cartItem.productId);

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        await this.inventoryService.reserveStock(product.id, cartItem.quantity);

        totalAmount += cartItem.quantity * cartItem.priceAtAdd;

        orderItems.push(
          this.orderItemRepository.create({
            productId: product.id,
            quantity: cartItem.quantity,
            price: cartItem.priceAtAdd,
          }),
        );
      }

      // 🔴 FUTURE: coupon / discount calculation here
      const discountAmount = 0;

      // 🔴 FUTURE: shipping calculation here
      const shippingAmount = dto.shippingAmount ?? 0;

      const finalAmount = totalAmount - discountAmount + shippingAmount;

      const order = manager.getRepository(Order).create({
        userId,
        status: OrderStatus.PENDING,
        totalAmount: finalAmount,
        discountAmount,
        shippingAmount,
        items: orderItems,
      });

      const savedOrder = await manager.getRepository(Order).save(order);

      await this.cartService.clearCart(userId);

      return savedOrder;
    });
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId, deletedAt: null },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { orders, total, page, limit };
  }

  async findOne(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId, deletedAt: null },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * UPDATE ORDER STATUS
   * -------------------------------------------------------
   * Handles inventory rollback on cancellation
   */
  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    adminUserId?: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({
        where: { id: orderId, deletedAt: null },
        relations: ['items'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
        [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        [OrderStatus.COMPLETED]: [],
        [OrderStatus.CANCELLED]: [],
      };

      if (!validTransitions[order.status].includes(dto.status)) {
        throw new BadRequestException(
          `Invalid status transition: ${order.status} → ${dto.status}`,
        );
      }

      if (
        dto.status === OrderStatus.CANCELLED &&
        order.status !== OrderStatus.CANCELLED
      ) {
        for (const item of order.items) {
          await this.inventoryService.cancelReservation(
            item.productId,
            item.quantity,
            orderId,
          );
        }
      }

      order.status = dto.status;
      order.updatedAt = new Date();

      return manager.getRepository(Order).save(order);
    });
  }

  /**
   * USER ORDER STATS
   */
  async getUserOrdersStats(userId: string) {
    return this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.userId = :userId', { userId })
      .andWhere('order.deletedAt IS NULL')
      .groupBy('order.status')
      .getRawMany();
  }
}
