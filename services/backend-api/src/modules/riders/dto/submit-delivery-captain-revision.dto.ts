import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";

export class SubmitDeliveryCaptainRevisionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  documentIds!: string[];
}
