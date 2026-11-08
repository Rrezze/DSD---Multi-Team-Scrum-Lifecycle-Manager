
/**
 * Product Backlog - Type Definitions
 *
 * Contains TypeScript types used by the Product Backlog feature.
 * Keeping feature-specific types here helps maintain consistency
 * and makes them reusable across the feature's files.
 */

/**
 * Supported ticket types in the Scrum Lifecycle Manager.
 */
export type TicketType = "EPIC" | "STORY" | "TASK" | "BUG";

/**
 * Represents the data required to create a new ticket.
 *
 * The field names follow the backend API contract.
 */
export interface CreateTicketPayload {
    type: TicketType;
    title: string;
    description: string;
    estimate_points: number;
}

/**
 * Stores validation errors associated with form fields.
 */
export type TicketFormErrors = Record<string, string>;
