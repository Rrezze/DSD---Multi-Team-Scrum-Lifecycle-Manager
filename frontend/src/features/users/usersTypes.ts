export const USER_ROLE_OPTIONS = [
    { value: "PRODUCT_OWNER", label: "Product Owner" },
    { value: "DEVELOPER", label: "Developer" },
    { value: "ENGINEERING_MANAGER", label: "Engineering Manager" },
] as const;

export type UserRole = (typeof USER_ROLE_OPTIONS)[number]["value"];

export function getUserRoleLabel(role: UserRole) {
    const option = USER_ROLE_OPTIONS.find(
        (roleOption) => roleOption.value === role
    );

    if (!option) {
        throw new Error(`Unknown user role: ${role}`);
    }

    return option.label;
}

export interface User {
    id: number;
    name: string;
    role: UserRole;
    unavailabilities: UnavailabilityPeriod[];
}

export interface UnavailabilityPeriod {
    id: number;
    startDate: string;
    endDate: string;
}

export type UserFormValues = Omit<User, "id" | "unavailabilities">;
