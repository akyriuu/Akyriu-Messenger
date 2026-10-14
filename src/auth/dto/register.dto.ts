import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/)
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[\s\S]+$/,
    {
      message:
        'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número.',
    },
  )
  password: string;
}
