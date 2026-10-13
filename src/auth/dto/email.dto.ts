import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token: string;
}

export class ResendVerificationDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class UpdateEmailDto extends ResendVerificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
