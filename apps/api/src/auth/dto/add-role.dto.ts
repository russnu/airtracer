import { IsEnum } from 'class-validator';
import { RoleName } from '../../roles/enums/role-name.enum';

export class AddRoleDto {
  @IsEnum(RoleName)
  role!: RoleName;
}
