import { IsString } from 'class-validator';

export class SetWishNftDto {
  @IsString()
  name: string;
}
