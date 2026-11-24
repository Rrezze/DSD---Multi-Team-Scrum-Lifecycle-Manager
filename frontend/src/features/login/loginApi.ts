import API_ENDPOINTS from "../../constants/apiEndPoints";
import apiClient from "../../services/apiClient";
import { getApiErrorMessage } from "../../utils/apiErrorHandler";
import { isUserRole } from "./loginTypes";
import type { LoginUser } from "./loginTypes";

function isLoginUser(data: unknown): data is LoginUser {
    if (!data || typeof data !== "object") return false;

    return "username" in data && typeof data.username === "string" && !!data.username.trim()
        && "first_name" in data && typeof data.first_name === "string"
        && "last_name" in data && typeof data.last_name === "string"
        && "role" in data && isUserRole(data.role);
}

export async function login(username: string): Promise<LoginUser> {
    const response = await apiClient.request(API_ENDPOINTS.LOGIN, {
        method: "POST",
        body: JSON.stringify({ username: username.trim() }),
    });
    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
        const errors = data && typeof data === "object" ? { ...data } : {};
        const field = "username" in errors ? errors.username : undefined;
        const messages = Array.isArray(field) ? field : [field];
        const message = messages.filter((item): item is string => typeof item === "string").join("\n");
        throw new Error(getApiErrorMessage(message ? { detail: message } : errors, response.status));
    }
    if (!isLoginUser(data)) {
        throw new Error("Invalid login response received from the server.");
    }
    return data;
}
