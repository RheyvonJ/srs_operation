import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginBody) {
    if (
      typeof body?.username !== 'string' ||
      typeof body?.password !== 'string' ||
      !body.username.trim() ||
      !body.password
    ) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.authService.login(body.username.trim(), body.password);
  }
}
