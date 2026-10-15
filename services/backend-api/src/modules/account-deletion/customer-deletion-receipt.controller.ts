import { Controller, Get, Header, Headers, Param } from "@nestjs/common";
import { CustomerErasureService } from "./customer-erasure.service";

// Read-only capability: no PII, no mutation, no authentication/business access.
// The secret is a header, never a URL/query parameter or application log value.
@Controller("account-deletion/receipt")
export class CustomerDeletionReceiptController {
  constructor(private readonly erasure: CustomerErasureService) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  async recover(@Headers("x-deletion-receipt") token: string) {
    return { message: "Saved deletion receipt", data: await this.erasure.recoverReceipt(token) };
  }
  @Get(":reference")
  @Header("Cache-Control", "private, no-store")
  async status(@Param("reference") reference: string, @Headers("x-deletion-receipt") token: string) {
    return { message: "Deletion receipt status", data: await this.erasure.publicReceipt(reference, token) };
  }
}
