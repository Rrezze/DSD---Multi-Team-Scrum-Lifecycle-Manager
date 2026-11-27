import { getBacklogTickets } from "../productBacklog/productBacklogApi";
import { getTeamCapacities, getTeams } from "../teams/teamsApi";
import type { BacklogTicket } from "../productBacklog/productBacklogTypes";
import apiClient from "../../services/apiClient";
import API_ENDPOINTS from "../../constants/apiEndPoints";
import type { ApiErrorResponse } from "../../types/apiTypes";
import { getApiErrorMessage } from "../../utils/apiErrorHandler";
import type { ApiSprint, PlanningTeam, SprintPayload } from "./sprintPlanningTypes";

export interface SprintPlanningData {
    tickets: BacklogTicket[];
    teams: PlanningTeam[];
}

async function readResponseData(response: Response): Promise<unknown> {
    const responseText = await response.text();

    try {
        return responseText ? JSON.parse(responseText) as unknown : null;
    } catch {
        if (response.ok) {
            throw new Error("Invalid response received from the server.");
        }
        return null;
    }
}

function throwForError(data: unknown, response: Response): void {
    if (!response.ok) {
        const errorData = data && typeof data === "object"
            ? data as ApiErrorResponse
            : {};
        throw new Error(getApiErrorMessage(errorData, response.status));
    }
}

function isApiSprint(value: unknown): value is ApiSprint {
    if (!value || typeof value !== "object") return false;
    const sprint = value as Record<string, unknown>;
    return typeof sprint.id === "number"
        && typeof sprint.name === "string"
        && typeof sprint.start_date === "string"
        && typeof sprint.end_date === "string"
        && typeof sprint.goal === "string";
}

export async function getSprints(): Promise<ApiSprint[]> {
    const response = await apiClient.request(API_ENDPOINTS.SPRINTS, { method: "GET" });
    const data = await readResponseData(response);
    throwForError(data, response);
    if (!Array.isArray(data) || !data.every(isApiSprint)) {
        throw new Error("Invalid sprints response.");
    }
    return data;
}

export async function createSprint(payload: SprintPayload): Promise<ApiSprint> {
    const response = await apiClient.request(API_ENDPOINTS.SPRINTS, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const data = await readResponseData(response);
    throwForError(data, response);
    if (!isApiSprint(data)) throw new Error("Invalid created sprint response.");
    return data;
}

export async function updateSprint(
    sprintId: number,
    payload: SprintPayload
): Promise<ApiSprint> {
    const response = await apiClient.request(API_ENDPOINTS.SPRINT_DETAIL(sprintId), {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
    const data = await readResponseData(response);
    throwForError(data, response);
    if (!isApiSprint(data)) throw new Error("Invalid updated sprint response.");
    return data;
}

export async function deleteSprint(sprintId: number): Promise<void> {
    const response = await apiClient.request(
        API_ENDPOINTS.SPRINT_DETAIL(sprintId),
        { method: "DELETE" }
    );
    if (!response.ok) {
        const data = await readResponseData(response);
        throwForError(data, response);
    }
}

export async function getSprintPlanningData(sprintId: number): Promise<SprintPlanningData> {
    const [tickets, apiTeams, capacities] = await Promise.all([
        getBacklogTickets(),
        getTeams(),
        getTeamCapacities(sprintId),
    ]);
    const capacityByTeamId = new Map(
        capacities.map((capacity) => [capacity.team, capacity.capacity_points])
    );

    const teams: PlanningTeam[] = apiTeams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        is_active: team.is_active,
        capacity_points: capacityByTeamId.get(team.id) ?? null,
    }));

    return { tickets, teams };
}
