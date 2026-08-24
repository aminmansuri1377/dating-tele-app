import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsString } from 'class-validator';
import { SubscriptionPlan } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { JwtPayload } from '../auth/jwt.strategy';

class CreateOrderDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}

class ConfirmPaymentDto {
  @IsString()
  txHash: string;

  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsString()
  senderAddress: string;

  @IsString()
  orderComment: string;
}

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('order')
  createOrder(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(user.sub, dto.plan);
  }

  @Post('confirm')
  confirmPayment(@CurrentUser() user: JwtPayload, @Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(user.sub, dto);
  }

  @Get('transactions')
  getMyTransactions(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.getMyTransactions(user.sub);
  }
}
