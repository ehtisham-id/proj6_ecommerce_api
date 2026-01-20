import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductImage } from './entities/product-image.entity';
import { CategoriesModule } from 'src/categories/categories.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage]), CategoriesModule],
  providers: [ProductsService],
  exports: [TypeOrmModule, ProductsService], 
})
export class ProductsModule {}
