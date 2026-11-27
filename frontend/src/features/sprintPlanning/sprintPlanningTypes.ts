import type { BacklogTicket } from "../productBacklog/productBacklogTypes";

export interface SprintDraft {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    goal: string;
}

export interface ApiSprint {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    goal: string;
}

export interface SprintPayload {
    name: string;
    start_date: string;
    end_date: string;
    goal: string;
}

export interface PlanningTeam {
    id: number;
    name: string;
    description: string;
    is_active: boolean;
    capacity_points: number | null;
}

export interface PlannedTicket {
    ticket: BacklogTicket;
    teamId: number | null;
}

