import API_ENDPOINTS from "../../constants/apiEndPoints";
import apiClient from "../../services/apiClient";
import type { ApiErrorResponse } from "../../types/apiTypes";
import { getApiErrorMessage } from "../../utils/apiErrorHandler";
import {
    USER_ROLE_OPTIONS,
    type ApiAbsence,
    type ApiUser,
    type CreateAbsencePayload,
    type CreateUserPayload,
    type UpdateAbsencePayload,
    type UpdateUserPayload,
    type UserRole,
} from "./usersTypes";

interface UserFilters {
    role?: UserRole;
    search?: string;
}

function isApiUser(value: unknown): value is ApiUser {
    if (!value || typeof value !== "object") {
        return false;
    }

    const user = value as Record<string, unknown>;

    return (
        typeof user.id === "number" &&
        typeof user.username === "string" &&
        typeof user.email === "string" &&
        typeof user.first_name === "string" &&
        typeof user.last_name === "string" &&
        typeof user.is_active === "boolean" &&
        USER_ROLE_OPTIONS.some((role) => role.value === user.role)
    );
}

function isApiAbsence(value: unknown): value is ApiAbsence {
    if (!value || typeof value !== "object") {
        return false;
    }

    const absence = value as Record<string, unknown>;

    return (
        typeof absence.id === "number" &&
        typeof absence.user === "number" &&
        typeof absence.start_date === "string" &&
        typeof absence.end_date === "string" &&
        typeof absence.reason === "string" &&
        (typeof absence.hours === "number" || absence.hours === null)
    );
}

async function readResponseData(response: Response): Promise<unknown> {
    const responseText = await response.text();

    try {
        return responseText ? JSON.parse(responseText) as unknown : null;
    } catch {
        if (response.ok) {
            throw new Error("Invalid response received from the server.");
        }
        return null;
    }
}

export async function getUsers(
    filters: UserFilters = {}
): Promise<ApiUser[]> {
    const params = new URLSearchParams();

    if (filters.role) {
        params.set("role", filters.role);
    }

    if (filters.search?.trim()) {
        params.set("search", filters.search.trim());
    }

    const queryString = params.toString();
    const endpoint = queryString
        ? `${API_ENDPOINTS.USERS}?${queryString}`
        : API_ENDPOINTS.USERS;
    const response = await apiClient.request(endpoint, { method: "GET" });
    const data = await readResponseData(response);

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse ?? {}, response.status)
        );
    }

    if (!Array.isArray(data) || !data.every(isApiUser)) {
        throw new Error("Invalid users response.");
    }

    return data;
}

export async function createUser(
    userData: CreateUserPayload
): Promise<ApiUser> {
    const response = await apiClient.request(API_ENDPOINTS.USERS, {
        method: "POST",
        body: JSON.stringify(userData),
    });
    const data = await readResponseData(response);

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse ?? {}, response.status)
        );
    }

    if (!isApiUser(data)) {
        throw new Error("Invalid created user response.");
    }

    return data;
}

export async function updateUser(
    userId: number,
    userData: UpdateUserPayload
): Promise<ApiUser> {
    const response = await apiClient.request(
        API_ENDPOINTS.USER_DETAIL(userId),
        {
            method: "PATCH",
            body: JSON.stringify(userData),
        }
    );
    const data = await readResponseData(response);

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse ?? {}, response.status)
        );
    }

    if (!isApiUser(data)) {
        throw new Error("Invalid updated user response.");
    }

    return data;
}

export async function deleteUser(userId: number): Promise<void> {
    const response = await apiClient.request(
        API_ENDPOINTS.USER_DETAIL(userId),
        { method: "DELETE" }
    );

    if (!response.ok) {
        const data = await readResponseData(response);
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse ?? {}, response.status)
        );
    }
}

export async function getUserAbsences(userId: number): Promise<ApiAbsence[]> {
    const response = await apiClient.request(
        API_ENDPOINTS.USER_ABSENCES(userId),
        { method: "GET" }
    );
    const data = await readResponseData(response);

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse ?? {}, response.status)
        );
    }

    if (!Array.isArray(data) || !data.every(isApiAbsence)) {
        throw new Error("Invalid user absences response.");
    }

    return data;
}

export async function createUserAbsence(
    userId: number,
    absenceData: CreateAbsencePayload
): Promise<ApiAbsence> {
    const response = await apiClient.request(
        API_ENDPOINTS.USER_ABSENCES(userId),
        {
            method: "POST",
            body: JSON.stringify(absenceData),
        }
    );
    const data = await readResponseData(response);

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse ?? {}, response.status)
        );
    }

    if (!isApiAbsence(data)) {
        throw new Error("Invalid created absence response.");
    }

    return data;
}

export async function deleteUserAbsence(absenceId: number): Promise<void> {
    const response = await apiClient.request(
        API_ENDPOINTS.ABSENCE_DETAIL(absenceId),
        { method: "DELETE" }
    );

    if (!response.ok) {
        const data = await readResponseData(response);
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse ?? {}, response.status)
        );
    }
}

export async function updateUserAbsence(
    absenceId: number,
    absenceData: UpdateAbsencePayload
): Promise<ApiAbsence> {
    const response = await apiClient.request(
        API_ENDPOINTS.ABSENCE_DETAIL(absenceId),
        {
            method: "PATCH",
            body: JSON.stringify(absenceData),
        }
    );
    const data = await readResponseData(response);

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse ?? {}, response.status)
        );
    }

    if (!isApiAbsence(data)) {
        throw new Error("Invalid updated absence response.");
    }

    return data;
}
