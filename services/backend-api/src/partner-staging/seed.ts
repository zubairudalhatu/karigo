import { PrismaClient, OrderStatus } from "@prisma/client";
import { hash } from "bcrypt";
export const stageId = (n: number) => `f0250000-0000-4000-8000-${String(n).padStart(12,"0")}`;
export async function seedStaging() {
  const db = new PrismaClient();
  try {
    const rows = await db.user.findMany({ select:{id:true,email:true,fullName:true} });
    if (rows.some(u => !u.id.startsWith("f0250000-") && !u.email?.endsWith("@partner-stage.invalid"))) throw Error("STAGING_NON_SYNTHETIC_IDENTITY");
    const passwordHash = await hash(process.env.STAGING_QA_PASSWORD!,12);
    for (const [n,kind] of [[1,"approved"],[2,"wrong-business"],[3,"applicant"],[4,"delete-check"],[6,"delete-qa"]] as const) {
      await db.user.upsert({where:{id:stageId(n)},update:{},create:{id:stageId(n),fullName:`[STAGING] ${kind}`,phoneNumber:`+23480000000${String(n).padStart(2,"0")}`,email:`${kind}@partner-stage.invalid`,passwordHash,role:"VENDOR",accountStatus:n===3?"PENDING":"ACTIVE",phoneVerified:true,
        ...(n===3?{}:{vendor:{create:{id:stageId(100+n),businessName:`[STAGING] ${kind} business`,businessCategory:"RESTAURANT",phoneNumber:`+23480000000${String(n).padStart(2,"0")}`,address:"Synthetic test address",city:"Abuja",state:"FCT",status:"ACTIVE"}}})}});
    }
    await db.user.upsert({where:{id:stageId(5)},update:{},create:{id:stageId(5),fullName:"[STAGING] Synthetic buyer",email:"buyer@partner-stage.invalid",phoneNumber:"+2348000000005",passwordHash,role:"CUSTOMER",accountStatus:"ACTIVE",phoneVerified:true,customerProfile:{create:{id:stageId(105),referralCode:"PARTNER-STAGING-BUYER"}}}});
    await db.product.upsert({where:{id:stageId(200)},update:{},create:{id:stageId(200),vendorId:stageId(101),name:"[STAGING] Test meal",description:"Synthetic catalogue item",productCategory:"FOOD",price:100,isActive:true,isAvailable:true}});
    const states: OrderStatus[]=["PAID","VENDOR_CONFIRMING","VENDOR_ACCEPTED","PREPARING","READY_FOR_PICKUP","VENDOR_REJECTED","CANCELLED","COMPLETED","PAID","PAID","PAID"];
    for (let i=0;i<states.length;i++) await db.order.upsert({where:{id:stageId(300+i)},update:{},create:{id:stageId(300+i),orderNumber:`STAGING-P25-${i+1}`,vendorId:stageId(101),customerId:stageId(105),serviceCategory:"FOOD",orderStatus:states[i],paymentStatus:"CASH_PENDING",paymentMethod:"CASH_ON_DELIVERY",subtotal:100,deliveryFee:0,totalAmount:100,items:{create:{productName:"[STAGING] Test meal",quantity:1,unitPrice:100,totalPrice:100,specialInstruction:"Synthetic preparation note"}},statusHistory:{create:{newStatus:states[i],changedByRole:"SYSTEM",note:"Synthetic staging fixture"}}}});
  } finally { await db.$disconnect(); }
}
