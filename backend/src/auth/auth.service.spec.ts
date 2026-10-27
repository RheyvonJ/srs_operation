import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const config = {
    get: (key: string, defaultValue = '') => {
      if (key === 'APP_LOGIN_USERNAME') return 'guest';
      if (key === 'APP_LOGIN_PASSWORD') return 'password';
      return defaultValue;
    },
  } as unknown as ConfigService;
  const service = new AuthService(config);

  it('authenticates the configured application credentials without a database user', () => {
    expect(service.login('guest', 'password')).toEqual({
      username: 'guest',
      displayName: 'guest',
    });
  });

  it('rejects incorrect usernames and passwords', () => {
    expect(() => service.login('wrong', 'password')).toThrow(UnauthorizedException);
    expect(() => service.login('guest', 'wrong')).toThrow(UnauthorizedException);
  });

  it('does not authenticate if application credentials are not configured', () => {
    const missingConfig = {
      get: (_key: string, defaultValue = '') => defaultValue,
    } as unknown as ConfigService;
    const unconfiguredService = new AuthService(missingConfig);

    expect(() => unconfiguredService.login('guest', 'password')).toThrow(
      ServiceUnavailableException,
    );
  });
});
