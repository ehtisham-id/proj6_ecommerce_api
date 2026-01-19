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
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';

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
