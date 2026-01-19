import { IsEmail, IsString, IsOptional, MinLength, IsUUID } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
