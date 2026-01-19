import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  ParseUUIDPipe,
  Patch 
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReviewQueryDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createReviewDto: CreateReviewDto, @CurrentUser() user: any) {
    return this.reviewsService.create(user.id, createReviewDto);
  }

  @Get()
  findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Get('product/:productId')
  async findProductReviews(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findProductReviews(productId, query);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.reviewsService.delete(id, user.id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() moderator: any,
    @Body('reason') reason?: string,
  ) {
    return this.reviewsService.approveReview(id, moderator.id, reason);
  }
}
