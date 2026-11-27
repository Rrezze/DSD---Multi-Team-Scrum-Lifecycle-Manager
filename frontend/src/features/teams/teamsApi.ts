
/**
 * Teams API
 *
 * Handles communication with the backend Teams and Team Membership endpoints.
 *
 * Teams:
 * - Fetch active teams
 * - Create a team
 * - Update a team
 * - Deactivate a team
 *
 * Memberships:
 * - Fetch team memberships
 * - Add a developer to a team
 * - Update a membership
 * - Remove a developer from a team
 */

import apiClient from "../../services/apiClient";
import API_ENDPOINTS from "../../constants/apiEndPoints";
import type { ApiErrorResponse } from "../../types/apiTypes";
import { getApiErrorMessage } from "../../utils/apiErrorHandler";

import type {
    ApiTeam,
    CreateTeamPayload,
} from "./teamsTypes";

/**
 * Represents a team membership returned by the backend.
 *
 * A membership connects one developer to one team
 * for a particular sprint.
 */
export interface ApiMembership {
    id: number;
    user: number;
    team: number;
    sprint: number;
    role: "DEVELOPER" | "SCRUM_MASTER";
    available_hours: number;
    absent_hours: number;
    capacity_points: number;
}
/**
 * Capacity information for an individual team member.
 */
export interface ApiMemberCapacity {
    membership: number;
    user: number;
    capacity_points: number;
}

/**
 * Calculated capacity for a team in a particular sprint.
 */
export interface ApiTeamCapacity {
    team: number;
    team_name: string;
    capacity_points: number;
    members: ApiMemberCapacity[];
}
/**
 * Data required to create a team membership.
 *
 * Role and available hours are optional because
 * the backend provides defaults for both fields.
 */
export interface CreateMembershipPayload {
    user: number;
    team: number;
    sprint: number;
    role?: "DEVELOPER" | "SCRUM_MASTER";
    available_hours?: number;
}

/**
 * Fields that can be updated in a team membership.
 */
export interface UpdateMembershipPayload {
    team?: number;
    role?: "DEVELOPER" | "SCRUM_MASTER";
    available_hours?: number;
}

/**
 * Reads and parses an API response.
 *
 * Handles empty responses and converts backend errors
 * into readable error messages.
 *
 * @param response - The response received from the backend.
 * @returns The parsed response data.
 * @throws Error if the request fails or the response is invalid.
 */
async function parseResponse<T>(response: Response): Promise<T> {
    const responseText = await response.text();

    let data: unknown = null;

    try {
        data = responseText ? JSON.parse(responseText) : null;
    } catch {
        if (response.ok) {
            throw new Error("Invalid response received from the server.");
        }
    }

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse, response.status)
        );
    }

    return data as T;
}

/**
 * Sends a request that does not require response data.
 *
 * Useful for DELETE operations that return HTTP 204 No Content.
 *
 * @param response - The response received from the backend.
 * @throws Error if the request fails.
 */
async function handleEmptyResponse(response: Response): Promise<void> {
    if (!response.ok) {
        const responseText = await response.text();

        let data: unknown = null;

        try {
            data = responseText ? JSON.parse(responseText) : null;
        } catch {
            // Keep the original HTTP status for error handling.
        }

        throw new Error(
            getApiErrorMessage(data as ApiErrorResponse, response.status)
        );
    }
}

// ============================================================
// TEAMS
// ============================================================

/**
 * Fetches all active teams from the backend.
 *
 * @returns A list of active teams.
 */
export async function getTeams(): Promise<ApiTeam[]> {
    const response = await apiClient.request(
        `${API_ENDPOINTS.TEAMS}?active=true`,
        {
            method: "GET",
        }
    );

    const data = await parseResponse<unknown>(response);

    if (!Array.isArray(data)) {
        throw new Error("Invalid teams response.");
    }

    return data as ApiTeam[];
}

/**
 * Creates a new team through the backend API.
 *
 * @param teamData - The details of the team to create.
 * @returns The newly created team.
 */
export async function createTeam(
    teamData: CreateTeamPayload
): Promise<ApiTeam> {
    const response = await apiClient.request(API_ENDPOINTS.TEAMS, {
        method: "POST",
        body: JSON.stringify(teamData),
    });

    const data = await parseResponse<unknown>(response);

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        !("id" in data) ||
        !("name" in data)
    ) {
        throw new Error("Invalid created team response.");
    }

    return data as ApiTeam;
}

/**
 * Updates an existing team.
 *
 * PATCH sends only the fields that have changed.
 *
 * @param teamId - ID of the team to update.
 * @param updates - Fields to update.
 * @returns The updated team.
 */
export async function updateTeam(
    teamId: number,
    updates: Partial<CreateTeamPayload>
): Promise<ApiTeam> {
    const response = await apiClient.request(
        `${API_ENDPOINTS.TEAMS}${teamId}/`,
        {
            method: "PATCH",
            body: JSON.stringify(updates),
        }
    );

    const data = await parseResponse<unknown>(response);

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        !("id" in data) ||
        !("name" in data)
    ) {
        throw new Error("Invalid updated team response.");
    }

    return data as ApiTeam;
}

/**
 * Deactivates a team through the backend API.
 *
 * The backend sets is_active to false rather than
 * permanently deleting the team from the database.
 *
 * @param teamId - ID of the team to deactivate.
 */
export async function deleteTeam(teamId: number): Promise<void> {
    const response = await apiClient.request(
        `${API_ENDPOINTS.TEAMS}${teamId}/`,
        {
            method: "DELETE",
        }
    );

    await handleEmptyResponse(response);
}

// ============================================================
// TEAM MEMBERSHIPS
// ============================================================

/**
 * Fetches team memberships from the backend.
 *
 * Can optionally filter by developer ID and sprint ID.
 *
 * @param userId - Optional developer ID.
 * @param sprintId - Optional sprint ID.
 * @returns A list of team memberships.
 */
export async function getMemberships(
    userId?: number,
    sprintId?: number
): Promise<ApiMembership[]> {
    const params = new URLSearchParams();

    if (userId !== undefined) {
        params.append("user", String(userId));
    }

    if (sprintId !== undefined) {
        params.append("sprint", String(sprintId));
    }

    const query = params.toString();

    const endpoint = query
        ? `/api/memberships/?${query}`
        : "/api/memberships/";

    const response = await apiClient.request(endpoint, {
        method: "GET",
    });

    const data = await parseResponse<unknown>(response);

    if (!Array.isArray(data)) {
        throw new Error("Invalid memberships response.");
    }

    return data as ApiMembership[];
}
/**
 * Fetches calculated team and member capacities for a sprint.
 *
 * @param sprintId - ID of the sprint.
 * @returns Capacity information for teams and their members.
 */
export async function getTeamCapacities(
    sprintId: number
): Promise<ApiTeamCapacity[]> {
    const response = await apiClient.request(
        `${API_ENDPOINTS.TEAMS}capacity/?sprint=${sprintId}`,
        {
            method: "GET",
        }
    );

    const data = await parseResponse<unknown>(response);

    if (!Array.isArray(data)) {
        throw new Error("Invalid team capacity response.");
    }

    return data as ApiTeamCapacity[];
}
/**
 * Adds a developer to a team for a particular sprint.
 *
 * The sprint ID must be a valid database ID.
 *
 * @param membershipData - Developer, team and sprint details.
 * @returns The newly created membership.
 */
export async function createMembership(
    membershipData: CreateMembershipPayload
): Promise<ApiMembership> {
    const response = await apiClient.request("/api/memberships/", {
        method: "POST",
        body: JSON.stringify(membershipData),
    });

    const data = await parseResponse<unknown>(response);

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        !("id" in data)
    ) {
        throw new Error("Invalid created membership response.");
    }

    return data as ApiMembership;
}

/**
 * Updates an existing team membership.
 *
 * Can change the team, role or available working hours.
 * The backend does not allow changing the user or sprint.
 *
 * @param membershipId - ID of the membership to update.
 * @param updates - Membership fields to update.
 * @returns The updated membership.
 */
export async function updateMembership(
    membershipId: number,
    updates: UpdateMembershipPayload
): Promise<ApiMembership> {
    const response = await apiClient.request(
        `/api/memberships/${membershipId}/`,
        {
            method: "PATCH",
            body: JSON.stringify(updates),
        }
    );

    const data = await parseResponse<unknown>(response);

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        !("id" in data)
    ) {
        throw new Error("Invalid updated membership response.");
    }

    return data as ApiMembership;
}

/**
 * Removes a developer from a team membership.
 *
 * @param membershipId - ID of the membership to remove.
 */
export async function deleteMembership(
    membershipId: number
): Promise<void> {
    const response = await apiClient.request(
        `/api/memberships/${membershipId}/`,
        {
            method: "DELETE",
        }
    );

    await handleEmptyResponse(response);
}
// Re-export API types for consumers that import them from teamsApi.
export type {
  ApiTeam,
  CreateTeamPayload,
} from "./teamsTypes";
