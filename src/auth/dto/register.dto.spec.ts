import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const validRegistration = {
    username: 'person_123',
    password: 'SecurePass1',
  };

  it('accepts a valid username and password', async () => {
    const dto = Object.assign(new RegisterDto(), validRegistration);

    expect(await validate(dto)).toHaveLength(0);
  });

  it.each(['lowercase1', 'UPPERCASE1', 'NoNumberPass', 'Short1'])(
    'rejects a password without the required complexity: %s',
    async (password) => {
      const dto = Object.assign(new RegisterDto(), {
        ...validRegistration,
        password,
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'password')).toBe(true);
    },
  );

});
