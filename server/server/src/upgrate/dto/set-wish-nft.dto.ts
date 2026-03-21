import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class SetWishNftDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  names: string[];
}
