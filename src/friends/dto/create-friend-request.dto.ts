import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateFriendRequestDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/)
  @MinLength(3)
  @MaxLength(30)
  username: string;
}
