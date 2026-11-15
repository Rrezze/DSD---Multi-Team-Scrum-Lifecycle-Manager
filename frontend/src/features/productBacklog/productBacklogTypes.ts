
/**
 * Product Backlog - Type Definitions
 *
 * Contains TypeScript types used by the Product Backlog feature.
 */

/**
 * Supported ticket types in the Scrum Lifecycle Manager.
 */
export type TicketType = "EPIC" | "STORY" | "TASK" | "BUG";

/**
 * Represents the data required to create a new ticket.
 *
 * Field names follow the backend API contract.
 */
export interface CreateTicketPayload {
    type: TicketType;
    title: string;
    description: string;
    estimate_points: number;
    parent: number | null;
}

/**
 * Stores validation errors associated with form fields.
 */
export type TicketFormErrors = Partial<
    Record<"title" | "estimatePoints", string>
>;

/**
 * Request payload used to reorder tickets in the backlog.
 */
export interface ReorderBacklogTicketsPayload {
    ticket_ids: number[];
}

export interface BacklogTicket {
    id: number;
    type: TicketType;
    title: string;
    description: string;
    estimate_points: number;
    parent: number | null;
    priority: number;
    status: string;
    sprint: number | null;
    assignees: number[];
    teams: number[];
    created_by: number;
    created_at: string;
    updated_at: string;
}