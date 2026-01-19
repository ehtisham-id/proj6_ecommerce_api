import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { InventoryService } from '../inventory/inventory.service';
import { ProductsService } from '../products/products.service';
import { Cart } from './entities/cart.entity';
import { AddCartItemDto, UpdateCartItemDto } from './dto';
import { User } from '../users/entities/user.entity';

interface CartItem {
  productId: string;
  quantity: number;
  priceAtAdd: number;
  addedAt: string;
}

@Injectable()
export class CartService {
  private readonly cartPrefix = 'cart:';
  private readonly cartTTL = 24 * 60 * 60; // 24 hours

  constructor(
    private readonly redis: Redis,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    private inventoryService: InventoryService,
    private productsService: ProductsService,
      private configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private getCartKey(userId: string): string {
    return `${this.cartPrefix}${userId}`;
  }

  async getCart(userId: string): Promise<{
    items: CartItem[];
    totalQuantity: number;
    totalAmount: number;
    lastUpdated: string;
  }> {
    const cartKey = this.getCartKey(userId);
    const cartData = await this.redis.get(cartKey);

    if (!cartData) {
      return {
        items: [],
        totalQuantity: 0,
        totalAmount: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const cart: {
      items: CartItem[];
      totals: { quantity: number; amount: number };
    } = JSON.parse(cartData);

    // Refresh TTL
    await this.redis.expire(cartKey, this.cartTTL);

    return {
      items: cart.items,
      totalQuantity: cart.totals.quantity,
      totalAmount: cart.totals.amount,
      lastUpdated: new Date().toISOString(),
    };
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<void> {
    const product = await this.productsService.findOne(dto.productId);

    if (product.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stockQuantity}`,
      );
    }

    const cartKey = this.getCartKey(userId);
    const cartData = await this.redis.get(cartKey);
    let cartItems: CartItem[] = [];

    if (cartData) {
      const cart = JSON.parse(cartData);
      cartItems = cart.items;
    }

    // Check if item exists
    const existingItemIndex = cartItems.findIndex(
      (item) => item.productId === dto.productId,
    );

    if (existingItemIndex > -1) {
      // Check total quantity against stock
      const newQuantity = cartItems[existingItemIndex].quantity + dto.quantity;
      if (newQuantity > product.stockQuantity) {
        throw new BadRequestException(`Total quantity exceeds available stock`);
      }
      cartItems[existingItemIndex].quantity = newQuantity;
    } else {
      cartItems.push({
        productId: dto.productId,
        quantity: dto.quantity,
        priceAtAdd: product.price,
        addedAt: new Date().toISOString(),
      });
    }

    // Recalculate totals
    const totals = this.calculateTotals(cartItems, product.price);

    await this.redis.setex(
      cartKey,
      this.cartTTL,
      JSON.stringify({ items: cartItems, totals }),
    );

    // Persist to DB for analytics (async, fire-and-forget)
    this.persistCartToDatabase(userId, cartItems, totals).catch(console.error);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<void> {
    const cart = await this.getCart(userId);
    const itemIndex = cart.items.findIndex((item) => item.productId === itemId);

    if (itemIndex === -1) {
      throw new NotFoundException('Cart item not found');
    }

    // Reload product to check current stock
    const product = await this.productsService.findOne(itemId);

    if (dto.quantity > product.stockQuantity) {
      throw new BadRequestException(`Quantity exceeds available stock`);
    }

    cart.items[itemIndex].quantity = dto.quantity;

    // Remove if quantity is 0
    if (dto.quantity === 0) {
      cart.items.splice(itemIndex, 1);
    }

    const totals = this.calculateTotals(cart.items);
    const cartKey = this.getCartKey(userId);

    await this.redis.setex(
      cartKey,
      this.cartTTL,
      JSON.stringify({
        items: cart.items,
        totals,
      }),
    );

    await this.persistCartToDatabase(userId, cart.items, totals);
  }

  async removeItem(userId: string, productId: string): Promise<void> {
    const cart = await this.getCart(userId);
    const itemIndex = cart.items.findIndex(
      (item) => item.productId === productId,
    );

    if (itemIndex > -1) {
      cart.items.splice(itemIndex, 1);
      const totals = this.calculateTotals(cart.items);
      const cartKey = this.getCartKey(userId);

      await this.redis.setex(
        cartKey,
        this.cartTTL,
        JSON.stringify({
          items: cart.items,
          totals,
        }),
      );

      await this.persistCartToDatabase(userId, cart.items, totals);
    }
  }

  async clearCart(userId: string): Promise<void> {
    const cartKey = this.getCartKey(userId);
    await this.redis.del(cartKey);

    // Mark cart as inactive in DB
    await this.cartRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );
  }

  private calculateTotals(
    items: CartItem[],
    overridePrice?: number,
  ): { quantity: number; amount: number } {
    return items.reduce(
      (totals, item) => {
        const price = overridePrice || item.priceAtAdd;
        totals.quantity += item.quantity;
        totals.amount += item.quantity * price;
        return totals;
      },
      { quantity: 0, amount: 0 },
    );
  }

  private async persistCartToDatabase(
    userId: string,
    items: CartItem[],
    totals: { quantity: number; amount: number },
  ): Promise<void> {
    const cartTotals = this.calculateTotals(items);

    await this.cartRepository.upsert(
      {
        userId,
        items,
        totalQuantity: cartTotals.quantity,
        totalAmount: cartTotals.amount,
        isActive: true,
      },
      ['userId'],
    );
  }
}
