import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InventoryService } from '../../inventory/inventory.service';

@Injectable()
export class InventoryEvents {
  constructor(private inventoryService: InventoryService) {}

  @OnEvent('inventory.low-stock')
  async handleLowStock(payload: { productId: string; threshold: number }) {
    // Future Kafka producer (Phase 11)
    console.log('Low stock alert:', payload);
  }
}
