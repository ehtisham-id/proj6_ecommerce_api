import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Headers 
} from '@nestjs/common';
import { PaymentsService } from './payments.service';


import {  ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentIntentDto } from './dto/payment-intent.dto';

import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto);
  }

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
  ) {
    // Mock webhook verification
    return this.paymentsService.handleWebhook(payload);
  }
}
