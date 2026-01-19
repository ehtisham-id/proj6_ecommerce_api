import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  ParseUUIDPipe 
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, ApplyCouponDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.couponsService.findAll();
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  apply(@Body() applyCouponDto: ApplyCouponDto, @CurrentUser() user: any) {
    return this.couponsService.applyCoupon(user.id, applyCouponDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.delete(id);
  }
}
