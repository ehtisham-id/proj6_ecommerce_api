import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '@common/enums/order-status.enum';
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto';
import { IdempotencyService } from '@common/utils/idempotency.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private ordersService: OrdersService,
    private dataSource: DataSource,
    private idempotencyService: IdempotencyService,
  ) {}

  async createPaymentIntent(dto: CreatePaymentIntentDto): Promise<{
    paymentIntent: any;
    clientSecret: string;
  }> {
    const idempotencyKey = dto.idempotencyKey || uuidv4();
    
    // Idempotency check
    const existingResponse = await this.idempotencyService.get(idempotencyKey);
    if (existingResponse) {
      return JSON.parse(existingResponse);
    }

    return this.dataSource.transaction(async (manager) => {
      // Validate order exists and is PENDING
      const order = await manager.getRepository(Order).findOne({
        where: { id: dto.orderId, status: OrderStatus.PENDING },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Valid pending order not found');
      }

      if (Math.abs(order.totalAmount - dto.amount) > 0.01) {
        throw new BadRequestException('Amount mismatch with order total');
      }

      // Check for existing payment
      const existingPayment = await manager.getRepository(Payment).findOne({
        where: { orderId: dto.orderId, status: In([PaymentStatus.PENDING, PaymentStatus.SUCCEEDED]) },
      });

      if (existingPayment) {
        throw new ConflictException('Payment already exists for this order');
      }

      // Create payment record
      const payment = manager.getRepository(Payment).create({
        idempotencyKey,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: 'USD',
        status: PaymentStatus.PENDING,
        paymentIntentId: `pi_${uuidv4().replace(/-/g, '')}`,
      });

      const savedPayment = await manager.getRepository(Payment).save(payment);

      // Mock Stripe response
      const mockPaymentIntent = {
        id: savedPayment.paymentIntentId,
        object: 'payment_intent',
        amount: dto.amount * 100, // cents
        amount_receivable: dto.amount * 100,
        status: 'requires_confirmation',
        client_secret: `${savedPayment.paymentIntentId}_secret_${Math.random().toString(36).substr(2, 16)}`,
      };

      // Store idempotency response
      await this.idempotencyService.set(idempotencyKey, JSON.stringify({
        paymentIntent: mockPaymentIntent,
        clientSecret: mockPaymentIntent.client_secret,
      }));

      return {
        paymentIntent: mockPaymentIntent,
        clientSecret: mockPaymentIntent.client_secret,
      };
    });
  }

  async confirmPayment(dto: ConfirmPaymentDto): Promise<{
    paymentIntent: any;
    order: any;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.getRepository(Payment).findOne({
        where: { paymentIntentId: dto.paymentIntentId },
        relations: ['order'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException('Payment intent not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new ConflictException(`Payment is ${payment.status}, not PENDING`);
      }

      // Mock payment processing (90% success rate for testing)
      const success = Math.random() > 0.1;
      
      payment.status = success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
      
      if (!success) {
        payment.failureReason = 'Card declined';
      }

      const updatedPayment = await manager.getRepository(Payment).save(payment);

      // Update order status
      if (success) {
        await this.ordersService.updateStatus(payment.orderId, 
          { status: OrderStatus.PAID }, 
          'system'
        );
      }

      return {
        paymentIntent: {
          id: dto.paymentIntentId,
          status: payment.status,
        },
        order: payment.order,
      };
    });
  }

  async handleWebhook(payload: any): Promise<void> {
    // Mock webhook handler for production webhook simulation
    const paymentIntentId = payload.data.object.id;
    
    if (payload.type === 'payment_intent.succeeded') {
      await this.confirmPayment({ paymentIntentId });
    }
  }
}
