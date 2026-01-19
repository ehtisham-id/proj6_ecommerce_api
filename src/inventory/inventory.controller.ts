import { 
  Controller, 
  Get, 
  Patch, 
  Param, 
  Body, 
  UseGuards, 
  ParseUUIDPipe,
  Query 
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  getInventory(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.getInventory(productId);
  }

  @Patch(':productId/adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  adjust(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() adjustInventoryDto: AdjustInventoryDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.adjustInventory(productId, adjustInventoryDto, user.id);
  }
}
