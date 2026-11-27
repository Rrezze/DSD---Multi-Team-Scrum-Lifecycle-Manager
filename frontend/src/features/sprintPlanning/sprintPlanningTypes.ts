import type { BacklogTicket } from "../productBacklog/productBacklogTypes";

export interface SprintDraft {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
}

export interface PlannedTicket {
    ticket: BacklogTicket;
    teamId: number | null;
}

