import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductImage } from './entities/product-image.entity';
import { CategoriesModule } from 'src/categories/categories.module';
import { ProductsController } from './products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    CategoriesModule,
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [TypeOrmModule, ProductsService],
})
export class ProductsModule {}
