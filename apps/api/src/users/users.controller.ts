import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  //-------------------------------------------------------------//
  @Get('/')
  findAll() {
    return this.usersService.findAll();
  }
  //-------------------------------------------------------------//
  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }
  //-------------------------------------------------------------//
}
