import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, ClassSerializerInterceptor, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Product } from './entities/product.entity';

@Controller('products')
@UseInterceptors(ClassSerializerInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: any) {
    return this.productsService.create(createProductDto, user.id);
  }

  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.update(id, updateProductDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.productsService.remove(id, user.id);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  addImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body('url') imageUrl: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.addImage(productId, imageUrl, user.id);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  removeImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.removeImage(productId, imageId, user.id);
  }
}
