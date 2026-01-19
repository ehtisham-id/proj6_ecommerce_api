import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@common/types/role.type';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  firstName: string;

  @IsString()
  @MinLength(3)
  lastName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
