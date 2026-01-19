import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { ProductsService } from '../products/products.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private dataSource: DataSource,
    private cartService: CartService,
    private inventoryService: InventoryService,
    private productsService: ProductsService,
  ) {}

  // In orders.service.ts createOrder method, add:
async createOrder(userId: string, createOrderDto: CreateOrderDto & { couponCode?: string }): Promise<Order> {
  let discountAmount = 0;
  let couponId: string | null = null;

  if (createOrderDto.couponCode) {
    const couponResult = await this.couponsService.applyCoupon(userId, {
      code: createOrderDto.couponCode,
      orderAmount: totalAmount // pre-discount total
    });

    if (couponResult.valid) {
      discountAmount = couponResult.discountAmount;
      couponId = couponResult.coupon!.id;
      
      // Record usage during transaction
      await this.couponsService.recordUsage(
        couponResult.coupon!.id, 
        userId, 
        savedOrder.id, // will be available after save
        totalAmount,
        discountAmount
      );
    }
  }

  const finalAmount = totalAmount - discountAmount + (createOrderDto.shippingAmount || 0);
  
  const order = this.orderRepository.create({
    // ... other fields
    discountAmount,
    couponId,
    totalAmount: finalAmount,
  });
}


  async findAll(userId: string, page = 1, limit = 20): Promise<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId, deletedAt: null },
      relations: ['items', 'items.product', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { orders, total, page, limit };
  }

  async findOne(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId, deletedAt: null },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(
    orderId: string,
    updateStatusDto: UpdateOrderStatusDto,
    adminUserId?: string
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

      // Status transition validation
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
        [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        [OrderStatus.COMPLETED]: [],
        [OrderStatus.CANCELLED]: [],
      };

      if (!validTransitions[order.status]?.includes(updateStatusDto.status)) {
        throw new BadRequestException(`Invalid status transition: ${order.status} → ${updateStatusDto.status}`);
      }

      // Handle inventory for cancellations
      if (updateStatusDto.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
        for (const item of order.items) {
          await this.inventoryService.cancelReservation(item.productId, item.quantity, orderId);
        }
      }

      order.status = updateStatusDto.status;
      order.updatedAt = new Date();

      return manager.getRepository(Order).save(order);
    });
  }

  async getUserOrdersStats(userId: string) {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.userId = :userId', { userId })
      .andWhere('order.deletedAt IS NULL')
      .groupBy('order.status')
      .getRawMany();

    return result;
  }
}
