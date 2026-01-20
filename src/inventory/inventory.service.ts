import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';

import { Inventory } from './entities/inventory.entity';
import {
  InventoryTransaction,
  InventoryTransactionType,
} from './entities/inventory-transaction.entity';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,

    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly dataSource: DataSource,
  ) {}

  async getInventory(productId: string): Promise<Inventory> {
    let inventory = await this.inventoryRepository.findOne({
      where: { productId },
      relations: ['product'],
    });

    if (!inventory) {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      inventory = await this.inventoryRepository.save(
        this.inventoryRepository.create({
          productId,
          product,
          availableQuantity: 0,
          reservedQuantity: 0,
          committedQuantity: 0,
        }),
      );
    }

    return inventory;
  }

  async adjustInventory(
    productId: string,
    dto: AdjustInventoryDto,
    userId?: string,
  ): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const inventoryRepo = manager.getRepository(Inventory);
      const transactionRepo = manager.getRepository(InventoryTransaction);
      const productRepo = manager.getRepository(Product);

      const inventory = await inventoryRepo.findOne({
        where: { productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory not found');
      }

      if (
        dto.quantity < 0 &&
        Math.abs(dto.quantity) > inventory.availableQuantity
      ) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${inventory.availableQuantity}`,
        );
      }

      inventory.availableQuantity += dto.quantity;

      if (inventory.availableQuantity < 0) {
        throw new ConflictException('Inventory cannot be negative');
      }

      if (dto.quantity < 0) {
        inventory.committedQuantity += Math.abs(dto.quantity);
      }

      const updatedInventory = await inventoryRepo.save(inventory);

      await transactionRepo.save(
        transactionRepo.create({
          productId,
          inventoryId: inventory.id,
          type: dto.type ?? InventoryTransactionType.ADJUSTMENT,
          quantity: dto.quantity,
          userId,
          reference: dto.reference,
        }),
      );

      if (dto.quantity < 0) {
        const product = await productRepo.findOne({
          where: { id: productId },
        });

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        product.soldQuantity += Math.abs(dto.quantity);
        await productRepo.save(product);
      }

      return updatedInventory;
    });
  }

  async reserveInventory(
    productId: string,
    quantity: number,
    orderId: string,
    userId: string,
  ): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const inventoryRepo = manager.getRepository(Inventory);
      const transactionRepo = manager.getRepository(InventoryTransaction);

      const inventory = await inventoryRepo.findOne({
        where: { productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory || inventory.availableQuantity < quantity) {
        throw new BadRequestException('Insufficient inventory');
      }

      inventory.availableQuantity -= quantity;
      inventory.reservedQuantity += quantity;

      const updated = await inventoryRepo.save(inventory);

      await transactionRepo.save({
        productId,
        inventoryId: inventory.id,
        type: InventoryTransactionType.RESERVATION,
        quantity,
        orderId,
        userId,
      });

      return updated;
    });
  }

  async commitReservation(
    productId: string,
    quantity: number,
    orderId: string,
    userId?: string,
  ): Promise<void> {
    await this.adjustInventory(
      productId,
      {
        quantity: -quantity,
        type: InventoryTransactionType.COMMIT,
        reference: orderId,
      },
      userId,
    );
  }

  async cancelReservation(
    productId: string,
    quantity: number,
    orderId: string,
    userId?: string,
  ): Promise<void> {
    await this.adjustInventory(
      productId,
      {
        quantity,
        type: InventoryTransactionType.CANCEL_RESERVATION,
        reference: orderId,
      },
      userId,
    );
  }

  async getLowStockReport(threshold = 10): Promise<Inventory[]> {
    return this.inventoryRepository.find({
      where: {
        availableQuantity: LessThan(threshold),
        product: {
          isActive: true,
        },
      },
      relations: ['product'],
      order: { availableQuantity: 'ASC' },
    });
  }

  async reserve(
    productId: string,
    quantity: number,
    orderId?: string,
    userId?: string,
  ): Promise<Inventory> {
    return this.reserveInventory(productId, quantity, orderId ?? ' ', userId?? ' ');
  }
}
