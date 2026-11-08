
/**
 * Shared API Client
 *
 * Provides a centralised function for communicating with
 * the backend API.
 *
 * This module is designed to be used across different features of the application,
 */

/**
 * Sends an HTTP request to the backend API.
 *
 * @param endpoint - API endpoint, for example "/api/tickets/".
 * @param options - Standard Fetch API request options.
 * @returns The HTTP response from the backend.
 * @throws Error when the backend cannot be reached.
 */
async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        return response;
    } catch {
        // Provide a consistent message for network-level failures.
        throw new Error(
            "Unable to connect to the server. Please check your connection and try again."
        );
    }
}

/**
 * Exposes the shared API request function.
 */
const apiClient = {
    request: apiRequest,
};

export default apiClient;
