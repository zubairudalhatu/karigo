import { IsString, MaxLength, MinLength } from "class-validator";

export class CaptainApplicationTrashDto {
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  reason!: string;
}
