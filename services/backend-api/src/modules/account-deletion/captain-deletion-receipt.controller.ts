import { Controller, Get, Header, Headers } from "@nestjs/common";
import { AccountDeletionService } from "./account-deletion.service";

// Read-only random capability, header only, no user identity or business access.
@Controller("account-deletion/captain-receipt")
export class CaptainDeletionReceiptController {
  constructor(private readonly deletion: AccountDeletionService) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  async status(@Headers("x-deletion-receipt") token: string) {
    return { message: "Captain deletion receipt", data: await this.deletion.captainDeletionReceipt(token) };
  }
}
