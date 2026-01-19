import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  ArrayNotEmpty,
  IsDateString,
} from 'class-validator';

export class ExportDto {
  @IsString()
  @IsIn(['csv', 'excel'])
  type: 'csv' | 'excel';

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  entities: string[]; // e.g. ['orders','users','products']

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
