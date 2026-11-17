import { seedStaging } from "./seed";
const db = { user: { findMany: jest.fn(), upsert: jest.fn() }, accountDeletionRequest: { findFirst: jest.fn() }, product: { upsert: jest.fn() }, order: { upsert: jest.fn() }, $disconnect: jest.fn() };
jest.mock("@prisma/client", () => ({ PrismaClient: jest.fn(() => db), OrderStatus: {} }));
jest.mock("bcrypt", () => ({ hash: jest.fn(async () => "synthetic-hash") }));
describe("isolated staging seed identity boundary", () => {
  const erased = {id:"erased-id",email:null,fullName:"Deleted KariGO account",phoneNumber:"deleted:erased-id",passwordHash:"",deletedAt:new Date(),accountStatus:"DEACTIVATED"};
  beforeEach(() => { jest.clearAllMocks(); db.user.findMany.mockResolvedValue([]); db.accountDeletionRequest.findFirst.mockResolvedValue(null); });
  it("accepts marked synthetic accounts", async () => { db.user.findMany.mockResolvedValue([{id:"fixture",email:"qa@partner-stage.invalid"}]); await seedStaging(); expect(db.user.upsert).toHaveBeenCalled(); });
  it("accepts a fully erased tombstone only with a completed deletion receipt", async () => { db.user.findMany.mockResolvedValue([erased]); db.accountDeletionRequest.findFirst.mockResolvedValue({id:"receipt"}); await seedStaging(); expect(db.accountDeletionRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({status:"COMPLETED",erasureVersion:{gte:1}})})); });
  it("rejects an erased-looking identity without a receipt", async () => { db.user.findMany.mockResolvedValue([erased]); await expect(seedStaging()).rejects.toThrow("STAGING_NON_SYNTHETIC_IDENTITY"); expect(db.user.upsert).not.toHaveBeenCalled(); });
  it.each([{...erased,accountStatus:"ACTIVE"},{...erased,passwordHash:"retained"},{...erased,phoneNumber:"unmarked"},{...erased,deletedAt:null}])("rejects incomplete erasure", async row => {db.user.findMany.mockResolvedValue([row]);db.accountDeletionRequest.findFirst.mockResolvedValue({id:"receipt"}); await expect(seedStaging()).rejects.toThrow("STAGING_NON_SYNTHETIC_IDENTITY");});
});
