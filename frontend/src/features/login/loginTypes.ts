import type { BacklogPermissions } from "./rolePermissions";

export interface LoginUser {
    username: string;
    first_name: string;
    last_name: string;
    role: "PRODUCT_OWNER" | "DEVELOPER" | "ENGINEERING_MANAGER";
}

export interface SessionUser {
    username: string;
    name: string;
    permissions: BacklogPermissions;
    role: LoginUser["role"];
}

export function isUserRole(value: unknown): value is LoginUser["role"] {
    return value === "PRODUCT_OWNER" || value === "DEVELOPER" || value === "ENGINEERING_MANAGER";
}
