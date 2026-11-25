import type { LoginUser } from "./loginTypes";

export interface BacklogPermissions {
    canCreateTickets: boolean;
    canReorderTickets: boolean;
}

export function getBacklogPermissions(role: LoginUser["role"]): BacklogPermissions {
    return {
        canCreateTickets: role === "ENGINEERING_MANAGER",
        canReorderTickets: role === "PRODUCT_OWNER",
    };
}
