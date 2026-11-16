import type {
    BacklogTicket,
    CreateTicketPayload,
    ReorderBacklogTicketsPayload,
} from "../productBacklogTypes";

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

export const backlogTickets: BacklogTicket[] = [
    {
        id: 1,
        type: "STORY",
        title: "Implement login",
        description: "Implement user authentication",
        estimate_points: 5,
        parent: null,
        priority: 1,
        status: "TODO",
        sprint: null,
        assignees: [101],
        teams: [1],
        created_by: 42,
        created_at: "2026-11-15T00:00:00.000Z",
        updated_at: "2026-11-15T00:00:00.000Z",
    },
    {
        id: 2,
        type: "TASK",
        title: "Set up CI pipeline",
        description: "Prepare the deployment pipeline configuration.",
        estimate_points: 3,
        parent: null,
        priority: 2,
        status: "IN_PROGRESS",
        sprint: null,
        assignees: [103],
        teams: [2],
        created_by: 42,
        created_at: "2026-11-15T00:00:00.000Z",
        updated_at: "2026-11-15T00:00:00.000Z",
    },
];

export const reorderTicketRequest: ReorderBacklogTicketsPayload = {
    ticket_ids: [2, 1],
};