import { IsEnum } from 'class-validator';
import { Role } from '@common/types/role.type';

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}
