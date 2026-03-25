import { IsString, IsNotEmpty } from 'class-validator';

export class JoinTableDto {
  @IsString()
  @IsNotEmpty()
  ownerId: string;
}
