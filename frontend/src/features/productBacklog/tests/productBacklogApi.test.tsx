
import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../tests/mocks/server";
import type { CreateTicketPayload, UpdateTicketPayload,} from "../productBacklogTypes";
import {
    createTicket,
    getBacklogTickets,
    reorderBacklogTickets,
    updateTicket,
} from "../productBacklogApi";
import API_ENDPOINTS from "../../../constants/apiEndPoints";
import {
    backlogTickets,
    reorderTicketRequest,
} from "./productBacklog.fixtures";

describe("createTicket", () => {
    const ticketData: CreateTicketPayload = {
        type: "STORY",
        title: "Implement login",
        description: "Implement user authentication",
        estimate_points: 5,
        parent: null,
    };

    beforeEach(() => {
        server.resetHandlers();
    });

    it("sends a POST request with the correct ticket data", async () => {
        let receivedMethod = "";
        let receivedPayload: unknown;

        server.use(
            http.post(API_ENDPOINTS.TICKETS, async ({ request }) => {
                receivedMethod = request.method;
                receivedPayload = await request.json();

                return HttpResponse.json(
                    { id: 1, title: "Implement login" },
                    { status: 201 }
                );
            })
        );

        await createTicket(ticketData);

        expect(receivedMethod).toBe("POST");
        expect(receivedPayload).toEqual(ticketData);
    });

    it("resolves when the ticket is created successfully", async () => {
        server.use(
            http.post(API_ENDPOINTS.TICKETS, () => {
                return HttpResponse.json(
                    { id: 1, title: "Implement login" },
                    { status: 201 }
                );
            })
        );

        await expect(createTicket(ticketData)).resolves.toBeUndefined();
    });

    it("throws the backend detail message when the request fails", async () => {
        server.use(
            http.post(API_ENDPOINTS.TICKETS, () => {
                return HttpResponse.json(
                    { detail: "Invalid ticket information." },
                    { status: 400 }
                );
            })
        );

        await expect(createTicket(ticketData)).rejects.toThrow(
            "Invalid ticket information."
        );
    });

    it("returns field-level validation errors when no detail is provided", async () => {
        server.use(
            http.post(API_ENDPOINTS.TICKETS, () => {
                return HttpResponse.json(
                    { title: ["This field is required."] },
                    { status: 400 }
                );
            })
        );

        await expect(createTicket(ticketData)).rejects.toThrow(
            "title: This field is required."
        );
    });

    it("uses the backend detail message for server errors when provided", async () => {
        server.use(
            http.post(API_ENDPOINTS.TICKETS, () => {
                return HttpResponse.json(
                    { detail: "Internal server error." },
                    { status: 500 }
                );
            })
        );

        await expect(createTicket(ticketData)).rejects.toThrow(
            "Internal server error."
        );
    });

    it("uses the server fallback message when a 500 response has no detail", async () => {
        server.use(
            http.post(API_ENDPOINTS.TICKETS, () => {
                return new HttpResponse(null, { status: 500 });
            })
        );

        await expect(createTicket(ticketData)).rejects.toThrow(
            "Something went wrong on the server. Please try again."
        );
    });

    it("handles an invalid JSON response", async () => {
        server.use(
            http.post(API_ENDPOINTS.TICKETS, () => {
                return new HttpResponse("Invalid JSON", {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
            })
        );

        await expect(createTicket(ticketData)).rejects.toThrow(
            "Unable to complete the request."
        );
    });

    it("propagates network errors from the API client", async () => {
        server.use(
            http.post(API_ENDPOINTS.TICKETS, () => {
                return HttpResponse.error();
            })
        );

        await expect(createTicket(ticketData)).rejects.toThrow(
            "Unable to connect to the server. Please check your connection and try again."
        );
    });

    it("fetches backlog tickets sorted by priority", async () => {
        const expectedTickets = [...backlogTickets].sort(
            (a, b) => a.priority - b.priority
        );

        server.use(
            http.get(API_ENDPOINTS.TICKETS, () => {
                return HttpResponse.json(backlogTickets, { status: 200 });
            })
        );

        await expect(getBacklogTickets()).resolves.toEqual(expectedTickets);
    });

    it("sends a reorder request with the correct ticket ids", async () => {
        let receivedPayload: unknown;

        server.use(
            http.post(API_ENDPOINTS.TICKETS_REORDER, async ({ request }) => {
                receivedPayload = await request.json();

                return HttpResponse.json(backlogTickets, { status: 200 });
            })
        );

        await reorderBacklogTickets(reorderTicketRequest.ticket_ids);

        expect(receivedPayload).toEqual(reorderTicketRequest);
    });

    it("throws a backend detail message when reorder fails", async () => {
        server.use(
            http.post(API_ENDPOINTS.TICKETS_REORDER, () => {
                return HttpResponse.json(
                    { detail: "Unable to reorder tickets." },
                    { status: 400 }
                );
            })
        );

        await expect(reorderBacklogTickets([2, 1])).rejects.toThrow(
            "Unable to reorder tickets."
        );
    });
});

describe("updateTicket", () => {
    const ticketId = 1;

    const updateData: UpdateTicketPayload = {
        type: "STORY",
        title: "Implement login page",
        description: "Implement user authentication",
        estimate_points: 8,
        status: "TODO",
        parent: null,
        teams:[],

    };

    beforeEach(() => {
        server.resetHandlers();
    });

    it("sends a PATCH request to the correct ticket endpoint", async () => {
        let receivedMethod = "";
        let receivedPayload: unknown;

        server.use(
            http.patch(
                API_ENDPOINTS.TICKET_DETAIL(ticketId),
                async ({ request }) => {
                    receivedMethod = request.method;
                    receivedPayload = await request.json();

                    return HttpResponse.json(
                        {
                            ...backlogTickets[0],
                            ...updateData,
                        },
                        { status: 200 }
                    );
                }
            )
        );

        await updateTicket(ticketId, updateData);

        expect(receivedMethod).toBe("PATCH");
        expect(receivedPayload).toEqual(updateData);
    });

    it("returns the updated ticket when the request succeeds", async () => {
        const updatedTicket = {
            ...backlogTickets[0],
            ...updateData,
        };

        server.use(
            http.patch(
                API_ENDPOINTS.TICKET_DETAIL(ticketId),
                () => HttpResponse.json(updatedTicket, { status: 200 })
            )
        );

        await expect(
            updateTicket(ticketId, updateData)
        ).resolves.toEqual(updatedTicket);
    });

    it("throws the backend validation message when the update fails", async () => {
        server.use(
            http.patch(
                API_ENDPOINTS.TICKET_DETAIL(ticketId),
                () =>
                    HttpResponse.json(
                        { title: ["This field is required."] },
                        { status: 400 }
                    )
            )
        );

        await expect(
            updateTicket(ticketId, updateData)
        ).rejects.toThrow("title: This field is required.");
    });

    it("throws the server error message when the update fails", async () => {
        server.use(
            http.patch(
                API_ENDPOINTS.TICKET_DETAIL(ticketId),
                () =>
                    HttpResponse.json(
                        { detail: "Unable to update ticket." },
                        { status: 500 }
                    )
            )
        );

        await expect(
            updateTicket(ticketId, updateData)
        ).rejects.toThrow("Unable to update ticket.");
    });
});
