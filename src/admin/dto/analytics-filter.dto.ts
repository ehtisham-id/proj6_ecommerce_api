// src/modules/admin/dto/analytics-filter.dto.ts
import { IsOptional, IsEnum, IsDateString, IsInt, Min, Type } from 'class-validator';
import { Type } from 'class-transformer';

export enum AnalyticsPeriod {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export class AnalyticsFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  days?: number = 30;
}
