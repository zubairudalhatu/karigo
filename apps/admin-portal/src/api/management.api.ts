import { api } from "./client"; export const managementApi={users:()=>api.get<any[]>("admin/users"),vendors:()=>api.get<any[]>("admin/vendors"),riders:()=>api.get<any[]>("admin/riders")};
