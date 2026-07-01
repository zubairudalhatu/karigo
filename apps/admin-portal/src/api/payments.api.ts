import { api } from "./client"; export const paymentsApi={approveRefund:(id:string)=>api.post(`admin/payments/${id}/approve-refund`)};
