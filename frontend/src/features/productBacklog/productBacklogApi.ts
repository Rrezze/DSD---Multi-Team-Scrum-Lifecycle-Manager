
/**
 * Product Backlog API Service
 *
 * Handles communication between the Product Backlog feature
 * and the Django backend.
 *
 */

import apiClient from "../../services/apiClient";
import type { CreateTicketPayload } from "./productBacklogTypes";

/**
 * Creates a new ticket in the backend.
 *
 * @param ticketData - Ticket information required by the API.
 * @throws Error when the backend rejects the request or
 *         the server cannot be reached.
 */
export async function createTicket(
    ticketData: CreateTicketPayload
): Promise<void> {
    // Send the ticket creation request through the shared API client.
    const response = await apiClient.request("/api/tickets/", {
        method: "POST",
        body: JSON.stringify(ticketData),
    });

    // Read the response body safely.
    const responseText = await response.text();

    // Parse the response when the backend returns JSON.
    let data: { detail?: string } = {};

    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        // Keep an empty response object if the response is not valid JSON.
        data = {};
    }

    // Convert unsuccessful HTTP responses into readable errors.
    if (!response.ok) {
        const errorMessage =
            typeof data.detail === "string"
                ? data.detail
                : response.status >= 500
                    ? "Unable to connect to the server. Please try again."
                    : "Unable to create ticket. Please check your information.";

        throw new Error(errorMessage);
    }
}
