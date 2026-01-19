import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  ParseUUIDPipe 
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  async addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: any
  ) {
    await this.cartService.addItem(user.id, dto);
    return this.cartService.getCart(user.id);
  }

  @Put('items/:productId')
  @UseGuards(JwtAuthGuard)
  async updateItem(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: any
  ) {
    await this.cartService.updateItem(user.id, productId, dto);
    return this.cartService.getCart(user.id);
  }

  @Delete('items/:productId')
  @UseGuards(JwtAuthGuard)
  async removeItem(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: any
  ) {
    await this.cartService.removeItem(user.id, productId);
    return this.cartService.getCart(user.id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async clearCart(@CurrentUser() user: any) {
    await this.cartService.clearCart(user.id);
    return { message: 'Cart cleared successfully' };
  }
}
