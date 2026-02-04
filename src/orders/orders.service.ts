import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';

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

  /* ===================== CREATE ORDER ===================== */

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const cart = await this.cartService.getCart(userId);

      // Use DTO items if provided and non-empty, otherwise fall back to server cart
      const useDtoItems =
        dto && Array.isArray(dto.items) && dto.items.length > 0;

      if (!useDtoItems && !cart.items.length) {
        throw new ConflictException('Cart is empty');
      }

      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      const sourceItems = useDtoItems ? dto.items : cart.items;

      for (const srcItem of sourceItems) {
        const product = await this.productsService.findOne(srcItem.productId);

        // reserve inventory
        await this.inventoryService.reserve(product.id, srcItem.quantity);

        // If item came from cart it may have a saved `priceAtAdd`, otherwise use current product price
        const priceToUse = (srcItem as any).priceAtAdd ?? product.price;

        totalAmount += srcItem.quantity * priceToUse;

        orderItems.push(
          this.orderItemRepository.create({
            productId: product.id,
            quantity: srcItem.quantity,
            price: priceToUse,
          }),
        );
      }

      const discountAmount = 0;
      const shippingAmount = dto.shippingAmount ?? 0;
      const taxAmount = dto.taxAmount ?? 0;

      const finalAmount =
        totalAmount - discountAmount + shippingAmount + taxAmount;

      const order = manager.getRepository(Order).create({
        userId,
        status: OrderStatus.PENDING,
        totalAmount: finalAmount,
        discountAmount,
        shippingAmount,
        taxAmount,
        items: orderItems,
      });

      const savedOrder = await manager.getRepository(Order).save(order);

      await this.cartService.clearCart(userId);

      return savedOrder;
    });
  }

  /* ===================== FIND ALL ===================== */

  async findAll(userId: string, page = 1, limit = 20) {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: {
        userId,
        deletedAt: IsNull(),
      },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      orders,
      total,
      page,
      limit,
    };
  }

  /** ADMIN: list all orders (no user filter) */
  async findAllAdmin(page = 1, limit = 20) {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: {
        deletedAt: IsNull(),
      },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      orders,
      total,
      page,
      limit,
    };
  }

  /* ===================== FIND ONE ===================== */

  async findOne(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId,
        userId,
        deletedAt: IsNull(),
      },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /* ===================== UPDATE STATUS ===================== */

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    adminUserId?: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({
        where: {
          id: orderId,
          deletedAt: IsNull(),
        },
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

  /* ===================== USER STATS ===================== */

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
