import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Payment, PaymentStatus } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '@common/enums/order-status.enum';

import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentIntentDto } from './dto/payment-intent.dto';
import { IdempotencyService } from '@common/utils/idempotency.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly ordersService: OrdersService,
    private readonly dataSource: DataSource,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * CREATE PAYMENT INTENT
   * -----------------------------------------
   * 🔴 EXTENSION POINT:
   * - Stripe SDK
   * - Multi-currency
   * - Taxes
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    const idempotencyKey = dto.idempotencyKey ?? uuidv4();

    const cached = await this.idempotencyService.get(idempotencyKey);
    if (cached) {
      return JSON.parse(cached);
    }

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({
        where: { id: dto.orderId, status: OrderStatus.PENDING },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Pending order not found');
      }

      if (Math.abs(order.totalAmount - dto.amount) > 0.01) {
        throw new BadRequestException('Amount does not match order total');
      }

      const existingPayment = await manager.getRepository(Payment).findOne({
        where: {
          orderId: dto.orderId,
          status: In([PaymentStatus.PENDING, PaymentStatus.SUCCEEDED]),
        },
      });

      if (existingPayment) {
        throw new ConflictException('Payment already exists for this order');
      }

      const paymentIntentId = `pi_${uuidv4().replace(/-/g, '')}`;

      const payment = manager.getRepository(Payment).create({
        idempotencyKey,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: 'USD',
        status: PaymentStatus.PENDING,
        paymentIntentId,
      });

      await manager.getRepository(Payment).save(payment);

      // 🔴 MOCK STRIPE RESPONSE
      const mockIntent = {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: Math.round(dto.amount * 100),
        status: 'requires_confirmation',
        client_secret: `${paymentIntentId}_secret_${uuidv4()}`,
      };

      const response = {
        paymentIntent: mockIntent,
        clientSecret: mockIntent.client_secret,
      };

      await this.idempotencyService.set(
        idempotencyKey,
        JSON.stringify(response),
      );

      return response;
    });
  }

  /**
   * CONFIRM PAYMENT
   * -----------------------------------------
   * 🔴 EXTENSION POINT:
   * - Stripe confirmation
   * - 3DS
   * - Failure retries
   */
  async confirmPayment(dto: ConfirmPaymentDto) {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.getRepository(Payment).findOne({
        where: { paymentIntentId: dto.paymentIntentId },
        relations: ['order'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new ConflictException(`Payment already ${payment.status}`);
      }

      // 🔴 MOCK RESULT
      const success = Math.random() > 0.1;

      payment.status = success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;

      if (!success) {
        payment.failureReason = 'Card declined';
      }

      await manager.getRepository(Payment).save(payment);

      if (success) {
        await this.ordersService.updateStatus(
          payment.orderId,
          { status: OrderStatus.PAID },
          'system',
        );
      }

      return {
        paymentIntent: {
          id: payment.paymentIntentId,
          status: payment.status,
        },
        order: payment.order,
      };
    });
  }

  /**
   * WEBHOOK HANDLER
   * -----------------------------------------
   * 🔴 EXTENSION POINT:
   * - Signature validation
   * - Event deduplication
   */
  async handleWebhook(payload: any): Promise<void> {
    const eventType = payload?.type;
    const paymentIntentId = payload?.data?.object?.id;

    if (!paymentIntentId) return;

    if (eventType === 'payment_intent.succeeded') {
      await this.confirmPayment({ paymentIntentId });
    }
  }
}
