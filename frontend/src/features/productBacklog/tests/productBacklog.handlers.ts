import { http, HttpResponse } from "msw";
import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { backlogTickets, createdTicket } from "./productBacklog.fixtures";

const reorderedBacklogTickets = backlogTickets
    .slice()
    .reverse()
    .map((ticket, index) => ({
        ...ticket,
        priority: index + 1,
    }));

export const productBacklogHandlers = [
    http.get(API_ENDPOINTS.TICKETS, () => {
        return HttpResponse.json(backlogTickets, {
            status: 200,
        });
    }),

    http.post(API_ENDPOINTS.TICKETS, async ({ request }) => {
        const payload = await request.json();

        if (
            payload &&
            typeof payload === "object" &&
            "title" in payload &&
            "estimate_points" in payload
        ) {
            return HttpResponse.json(createdTicket, {
                status: 201,
            });
        }

        return HttpResponse.json(
            { detail: "Invalid ticket payload." },
            { status: 400 }
        );
    }),

    http.post(API_ENDPOINTS.TICKETS_REORDER, async ({ request }) => {
        const payload = await request.json();

        if (
            payload &&
            typeof payload === "object" &&
            "ticket_ids" in payload
        ) {
            return HttpResponse.json(reorderedBacklogTickets, {
                status: 200,
            });
        }

        return HttpResponse.json(
            { detail: "Invalid reorder payload." },
            { status: 400 }
        );
    }),
];