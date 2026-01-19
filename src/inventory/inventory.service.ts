import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { Product } from '../products/entities/product.entity';
import { InventoryTransactionType } from './entities/inventory-transaction.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepository: Repository<InventoryTransaction>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
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
      inventory = this.inventoryRepository.create({
        productId,
        product,
        availableQuantity: 0,
      });
      inventory = await this.inventoryRepository.save(inventory);
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

      // Lock inventory row
      const inventory = await inventoryRepo.findOne({
        where: { productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory not found');
      }

      // Validate stock availability for outflows
      if (
        dto.quantity < 0 &&
        Math.abs(dto.quantity) > inventory.availableQuantity
      ) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${inventory.availableQuantity}, Requested: ${Math.abs(dto.quantity)}`,
        );
      }

      // Optimistic concurrency check
      const product = await productRepo.findOne({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Update inventory
      inventory.availableQuantity += dto.quantity;

      if (dto.quantity < 0) {
        inventory.committedQuantity += dto.quantity; // Track sold items
      }

      // Enforce constraints
      if (inventory.availableQuantity < 0) {
        throw new ConflictException('Cannot have negative inventory');
      }

      const updatedInventory = await inventoryRepo.save(inventory);

      // Record transaction
      const transaction = transactionRepo.create({
        productId,
        inventoryId: inventory.id,
        type: dto.type || InventoryTransactionType.ADJUSTMENT,
        quantity: dto.quantity,
        userId,
        reference: dto.reference,
      });
      await transactionRepo.save(transaction);

      // Update product sold quantity
      product.soldQuantity += Math.max(0, -dto.quantity);
      await productRepo.save(product);

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
      const inventory = await manager.getRepository(Inventory).findOne({
        where: { productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory || inventory.availableQuantity < quantity) {
        throw new BadRequestException('Insufficient inventory for reservation');
      }

      inventory.reservedQuantity += quantity;
      inventory.availableQuantity -= quantity;

      const updated = await manager.getRepository(Inventory).save(inventory);

      // Record reservation transaction
      await manager.getRepository(InventoryTransaction).save({
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

  async commitReservation(productId: string, orderId: string): Promise<void> {
    await this.adjustInventory(
      productId,
      { quantity: 0, reference: orderId },
      undefined,
    );
  }

  async cancelReservation(
    productId: string,
    quantity: number,
    orderId: string,
  ): Promise<void> {
    await this.adjustInventory(productId, {
      quantity: quantity,
      type: InventoryTransactionType.CANCEL_RESERVATION,
      reference: orderId,
    });
  }

  async getLowStockReport(threshold: number = 10): Promise<Inventory[]> {
    return this.inventoryRepository.find({
      where: {
        availableQuantity: LessThan(threshold),
        product: { status: 'PUBLISHED', isActive: true },
      },
      relations: ['product'],
      order: { availableQuantity: 'ASC' },
    });
  }
}
