import { Controller, Post, Body, UseGuards, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';

import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentIntentDto } from './dto/payment-intent.dto';

import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto);
  }

  /**
   * Webhook endpoint (Stripe, etc.)
   * Public by design
   */
  @Post('webhook')
  @Public()
  handleWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    // Signature validation can be added later
    return this.paymentsService.handleWebhook(payload);
  }
}
