import apiClient from "../../services/apiClient";
import type { ApiErrorResponse } from "../../types/apiTypes";
import { getApiErrorMessage } from "../../utils/apiErrorHandler";
import type { CreateTicketPayload } from "./productBacklogTypes";
import API_ENDPOINTS from "../../constants/apiEndPoints";

export async function createTicket(
    ticketData: CreateTicketPayload
): Promise<void> {
    const response = await apiClient.request(API_ENDPOINTS.TICKETS, {
        method: "POST",
        body: JSON.stringify(ticketData),
    });

    const responseText = await response.text();

    let data: ApiErrorResponse = {};

    try {
        data = responseText
            ? JSON.parse(responseText) as ApiErrorResponse
            : {};
    } catch {
        // Ignore invalid JSON responses.
    }

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(data, response.status)
        );
    }
}