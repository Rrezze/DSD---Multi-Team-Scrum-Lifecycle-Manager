import type { ApiErrorResponse } from "../types/apiTypes";

export function getApiErrorMessage(
    data: ApiErrorResponse,
    status: number
): string {
    if (typeof data.detail === "string") {
        return data.detail;
    }

    if (typeof data.message === "string") {
        return data.message;
    }

    const errors = Object.entries(data).flatMap(([field, value]) =>
        Array.isArray(value)
            ? value
                .filter((item): item is string => typeof item === "string")
                .map(item => `${field}: ${item}`)
            : []
    );

    if (errors.length > 0) {
        return errors.join("\n");
    }

    return status >= 500
        ? "Something went wrong on the server. Please try again."
        : "Unable to complete the request.";
}