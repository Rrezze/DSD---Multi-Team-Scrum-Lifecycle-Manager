export enum UserRole {
    PRODUCT_OWNER = "PRODUCT_OWNER",
    DEVELOPER = "DEVELOPER",
    ENGINEERING_MANAGER = "ENGINEERING_MANAGER",
}

export const USER_ROLE_OPTIONS = [
    { value: UserRole.PRODUCT_OWNER, label: "Product Owner" },
    { value: UserRole.DEVELOPER, label: "Developer" },
    { value: UserRole.ENGINEERING_MANAGER, label: "Engineering Manager" },
] as const;

export interface ApiUser {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    is_active: boolean;
}

export type CreateUserPayload = Omit<ApiUser, "id" | "is_active" | "role"> & {
    role?: UserRole;
};

export type UpdateUserPayload = Pick<
    ApiUser,
    "first_name" | "last_name" | "email"
>;

export interface ApiAbsence {
    id: number;
    user: number;
    start_date: string;
    end_date: string;
    reason: string;
    hours: number | null;
}

export interface CreateAbsencePayload {
    start_date: string;
    end_date: string;
    reason?: string;
    hours?: number | null;
}

export type UpdateAbsencePayload = Partial<CreateAbsencePayload>;

export function toUnavailabilityPeriod(
    absence: ApiAbsence
): UnavailabilityPeriod {
    return {
        id: absence.id,
        startDate: absence.start_date,
        endDate: absence.end_date,
        reason: absence.reason,
        hours: absence.hours,
    };
}

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
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    name: string;
    role: UserRole;
    unavailabilities: UnavailabilityPeriod[];
    unavailabilitiesLoaded: boolean;
}

export interface UnavailabilityPeriod {
    id: number;
    startDate: string;
    endDate: string;
    reason: string;
    hours: number | null;
}
