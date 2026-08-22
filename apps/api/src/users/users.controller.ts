import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/enums/role-name.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  //-------------------------------------------------------------//
  @Roles(RoleName.ADMIN)
  @Get('/')
  findAll() {
    return this.usersService.findAll();
  }
}
