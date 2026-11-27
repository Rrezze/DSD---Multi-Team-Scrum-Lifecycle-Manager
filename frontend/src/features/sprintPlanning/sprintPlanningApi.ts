import { getBacklogTickets, getTeams } from "../productBacklog/productBacklogApi";
import type { BacklogTicket, Team } from "../productBacklog/productBacklogTypes";

export interface SprintPlanningData {
    tickets: BacklogTicket[];
    teams: Team[];
}

export async function getSprintPlanningData(): Promise<SprintPlanningData> {
    const [tickets, teams] = await Promise.all([
        getBacklogTickets(),
        getTeams(),
    ]);

    return { tickets, teams };
}
