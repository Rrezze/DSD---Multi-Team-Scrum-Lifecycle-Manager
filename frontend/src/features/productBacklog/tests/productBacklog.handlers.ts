import { http, HttpResponse } from "msw";
import { createdTicket } from "./productBacklog.fixtures";

export const productBacklogHandlers = [
    http.post("/api/tickets/", () => {
        return HttpResponse.json(createdTicket, {
            status: 201,
        });
    }),
];