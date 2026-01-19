import { IsUUID, IsInt, Min, Max, IsString, Length, IsOptional, IsArray, IsURL, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @IsString()
  @Length(10, 2000)
  comment: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsURL({}, { each: true })
  images?: string[];
}
