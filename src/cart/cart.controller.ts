import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@auth/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: { id: string }) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  async addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.cartService.addItem(user.id, dto);
    return this.cartService.getCart(user.id);
  }

  @Put('items/:productId')
  async updateItem(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.cartService.updateItem(user.id, productId, dto);
    return this.cartService.getCart(user.id);
  }

  @Delete('items/:productId')
  async removeItem(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.cartService.removeItem(user.id, productId);
    return this.cartService.getCart(user.id);
  }

  @Delete()
  async clearCart(@CurrentUser() user: { id: string }) {
    await this.cartService.clearCart(user.id);
    return { message: 'Cart cleared successfully' };
  }
}
