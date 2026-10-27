import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  login(username: string, password: string) {
    const expectedUsername = this.config.get<string>('APP_LOGIN_USERNAME', '');
    const expectedPassword = this.config.get<string>('APP_LOGIN_PASSWORD', '');

    if (!expectedUsername || !expectedPassword) {
      throw new ServiceUnavailableException(
        'Application login credentials are not configured',
      );
    }

    if (
      !this.safeEqual(username, expectedUsername) ||
      !this.safeEqual(password, expectedPassword)
    ) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return {
      username: expectedUsername,
      displayName: expectedUsername,
    };
  }

  private safeEqual(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
