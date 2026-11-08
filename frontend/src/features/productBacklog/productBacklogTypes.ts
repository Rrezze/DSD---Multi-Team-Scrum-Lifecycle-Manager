
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
    Record<"title" | "description" | "estimatePoints", string>
>;
