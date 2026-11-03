import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { AddRoleDto } from './dto/add-role.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
  //-------------------------------------------------------------//
  // Any signed-in user may add the other role to their own account.
  @HttpCode(HttpStatus.OK)
  @Post('me/roles')
  addRole(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddRoleDto) {
    return this.authService.addRole(user, dto.role);
  }
  //-------------------------------------------------------------//
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
  //-------------------------------------------------------------//
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
