import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { UpdateCaptainAvailabilityDto } from "./update-captain-availability.dto";
describe("Scoped Captain trace DTO", () => {
  const pipe = new ValidationPipe({ transform:true, whitelist:true, forbidNonWhitelisted:true });
  const context = { captainUserId:"22222222-2222-4222-8222-222222222222", workId:"11111111-1111-4111-8111-111111111111", mode:"RIDE", epoch:"abcdefgh_abcdefgh", startedAt:new Date().toISOString() };
  it("accepts the optional strict scope without changing legacy payloads", async()=>{
    for(const traceContext of [undefined,context]) await expect(pipe.transform({latitude:9.08,longitude:7.49,...(traceContext?{traceContext}:{})},{type:"body",metatype:UpdateCaptainAvailabilityDto})).resolves.toBeDefined();
  });
  it.each([{workId:"not-a-uuid"},{captainUserId:"not-a-uuid"},{mode:"ADMIN"},{epoch:"raw arbitrary private text"},{startedAt:"bad-date"},{role:"SUPER_ADMIN"}])("rejects malformed or extra scope fields %p", async patch=>{
    await expect(pipe.transform({latitude:9.08,longitude:7.49,traceContext:{...context,...patch}},{type:"body",metatype:UpdateCaptainAvailabilityDto})).rejects.toThrow();
  });
});
