import type { CreateTicketPayload } from "../productBacklogTypes";

export const validTicket: CreateTicketPayload = {
    type: "STORY",
    title: "Implement login",
    description: "Implement user authentication",
    estimate_points: 5,
    parent: null,
};

export const createdTicket = {
    id: 1,
    ...validTicket,
};