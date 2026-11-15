import apiClient from "../../services/apiClient";
import type { ApiErrorResponse } from "../../types/apiTypes";
import { getApiErrorMessage } from "../../utils/apiErrorHandler";
import type {
    CreateTicketPayload,
    BacklogTicket,
    ReorderBacklogTicketsPayload,
} from "./productBacklogTypes";
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

export async function getBacklogTickets(): Promise<BacklogTicket[]> {
    const response = await apiClient.request(API_ENDPOINTS.TICKETS, {
        method: "GET",
    });

    const responseText = await response.text();

    let data: unknown = [];

    try {
        data = responseText ? JSON.parse(responseText) : [];
    } catch {
        if (response.ok) {
            throw new Error("Invalid response received from the server.");
        }
    }

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse, response.status)
        );
    }

    if (!Array.isArray(data)) {
        throw new Error("Invalid backlog tickets response.");
    }

    return (data as BacklogTicket[]).sort(
        (a, b) => a.priority - b.priority
    );
}


export async function reorderBacklogTickets(
    ticketIds: number[]
): Promise<BacklogTicket[]> {
    const payload: ReorderBacklogTicketsPayload = {
        ticket_ids: ticketIds,
    };

    const response = await apiClient.request(
        API_ENDPOINTS.TICKETS_REORDER,
        {
            method: "POST",
            body: JSON.stringify(payload),
        }
    );

    const responseText = await response.text();

    let data: unknown = null;

    try {
        data = responseText ? JSON.parse(responseText) : null;
    } catch {
        if (response.ok) {
            throw new Error("Invalid response received from the server.");
        }
    }

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(
                data as ApiErrorResponse,
                response.status
            )
        );
    }

    if (!Array.isArray(data)) {
        throw new Error("Invalid reordered backlog response.");
    }

    return data as BacklogTicket[];
}
