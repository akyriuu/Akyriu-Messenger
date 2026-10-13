import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const validRegistration = {
    email: 'Person@Example.com',
    username: 'person_123',
    password: 'SecurePass1',
  };

  it('accepts a valid email and password with all required character types', async () => {
    const dto = plainToInstance(RegisterDto, validRegistration);

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('person@example.com');
  });

  it.each(['lowercase1', 'UPPERCASE1', 'NoNumberPass', 'Short1'])(
    'rejects a password without the required complexity: %s',
    async (password) => {
      const dto = plainToInstance(RegisterDto, {
        ...validRegistration,
        password,
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'password')).toBe(true);
    },
  );

  it('rejects an invalid email address', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegistration,
      email: 'not-an-email',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });
});
