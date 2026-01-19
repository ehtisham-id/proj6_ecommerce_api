import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { Role } from '@common/types/role.type';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  @Roles(Role.SELLER, Role.ADMIN)
  getInventory(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.getInventory(productId);
  }

  @Patch(':productId/adjust')
  @Roles(Role.SELLER, Role.ADMIN)
  adjust(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AdjustInventoryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.adjustInventory(productId, dto, user.id);
  }
}
