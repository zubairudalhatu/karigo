import { PartialType } from "@nestjs/swagger";
import { ProductInputDto } from "./product-input.dto";

export class UpdateProductDto extends PartialType(ProductInputDto) {}
