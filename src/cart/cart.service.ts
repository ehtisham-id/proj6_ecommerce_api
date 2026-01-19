import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';

import { ProductsService } from '../products/products.service';
import { Cart } from './entities/cart.entity';
import { AddCartItemDto, UpdateCartItemDto } from './dto';

interface CartItem {
  productId: string;
  quantity: number;
  priceAtAdd: number;
  addedAt: string;
}

interface CartCache {
  items: CartItem[];
  totals: {
    quantity: number;
    amount: number;
  };
}

@Injectable()
export class CartService {
  private readonly cartPrefix = 'cart:';
  private readonly cartTTL = 24 * 60 * 60; // 24 hours

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,

    private readonly productsService: ProductsService,

    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  private getCartKey(userId: string): string {
    return `${this.cartPrefix}${userId}`;
  }

  async getCart(userId: string) {
    const cartKey = this.getCartKey(userId);
    const data = await this.redis.get(cartKey);

    if (!data) {
      return {
        items: [],
        totalQuantity: 0,
        totalAmount: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const cart: CartCache = JSON.parse(data);

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

    if (dto.quantity > product.stockQuantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stockQuantity}`,
      );
    }

    const cartKey = this.getCartKey(userId);
    const data = await this.redis.get(cartKey);

    const cart: CartCache = data
      ? JSON.parse(data)
      : { items: [], totals: { quantity: 0, amount: 0 } };

    const existing = cart.items.find(
      (item) => item.productId === dto.productId,
    );

    if (existing) {
      const newQty = existing.quantity + dto.quantity;
      if (newQty > product.stockQuantity) {
        throw new BadRequestException('Total quantity exceeds available stock');
      }
      existing.quantity = newQty;
    } else {
      cart.items.push({
        productId: dto.productId,
        quantity: dto.quantity,
        priceAtAdd: product.price,
        addedAt: new Date().toISOString(),
      });
    }

    cart.totals = this.calculateTotals(cart.items);

    await this.redis.setex(cartKey, this.cartTTL, JSON.stringify(cart));
    await this.persistCartToDatabase(userId, cart.items, cart.totals);
  }

  async updateItem(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ): Promise<void> {
    const cartKey = this.getCartKey(userId);
    const data = await this.redis.get(cartKey);

    if (!data) {
      throw new NotFoundException('Cart is empty');
    }

    const cart: CartCache = JSON.parse(data);
    const item = cart.items.find((i) => i.productId === productId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const product = await this.productsService.findOne(productId);

    if (dto.quantity > product.stockQuantity) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    if (dto.quantity === 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId);
    } else {
      item.quantity = dto.quantity;
    }

    cart.totals = this.calculateTotals(cart.items);

    await this.redis.setex(cartKey, this.cartTTL, JSON.stringify(cart));
    await this.persistCartToDatabase(userId, cart.items, cart.totals);
  }

  async removeItem(userId: string, productId: string): Promise<void> {
    const cartKey = this.getCartKey(userId);
    const data = await this.redis.get(cartKey);

    if (!data) return;

    const cart: CartCache = JSON.parse(data);
    cart.items = cart.items.filter((i) => i.productId !== productId);
    cart.totals = this.calculateTotals(cart.items);

    await this.redis.setex(cartKey, this.cartTTL, JSON.stringify(cart));
    await this.persistCartToDatabase(userId, cart.items, cart.totals);
  }

  async clearCart(userId: string): Promise<void> {
    await this.redis.del(this.getCartKey(userId));

    await this.cartRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );
  }

  private calculateTotals(items: CartItem[]) {
    return items.reduce(
      (acc, item) => {
        acc.quantity += item.quantity;
        acc.amount += item.quantity * item.priceAtAdd;
        return acc;
      },
      { quantity: 0, amount: 0 },
    );
  }

  private async persistCartToDatabase(
    userId: string,
    items: CartItem[],
    totals: { quantity: number; amount: number },
  ): Promise<void> {
    await this.cartRepository.upsert(
      {
        userId,
        items,
        totalQuantity: totals.quantity,
        totalAmount: totals.amount,
        isActive: true,
      },
      ['userId'],
    );
  }
}
