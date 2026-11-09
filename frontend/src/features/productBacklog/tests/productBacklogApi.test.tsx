
import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../tests/mocks/server";
import type { CreateTicketPayload } from "../productBacklogTypes";
import { createTicket } from "../productBacklogApi";
import API_ENDPOINTS from "../../../constants/apiEndPoints";

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
});
