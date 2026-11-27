import { http, HttpResponse } from "msw";

import API_ENDPOINTS from "../../../constants/apiEndPoints";
import type { ApiTeam, ApiTeamCapacity } from "../../teams/teamsApi";
import type { ApiSprint, SprintPayload } from "../sprintPlanningTypes";
import { sprintFixtures } from "./sprintPlanning.fixtures";

interface SprintPlanningHandlerOptions {
    sprints?: ApiSprint[];
    teams?: ApiTeam[];
    capacities?: ApiTeamCapacity[];
}

export function createSprintPlanningHandlers({
    sprints: initialSprints = sprintFixtures,
    teams = [],
    capacities = [],
}: SprintPlanningHandlerOptions = {}) {
    let sprints = initialSprints.map((sprint) => ({ ...sprint }));

    return [
        http.get(API_ENDPOINTS.SPRINTS, () => HttpResponse.json(sprints)),
        http.post(API_ENDPOINTS.SPRINTS, async ({ request }) => {
            const payload = await request.json() as SprintPayload;
            const nextId = Math.max(0, ...sprints.map((sprint) => sprint.id)) + 1;
            const createdSprint: ApiSprint = { id: nextId, ...payload };
            sprints = [...sprints, createdSprint];
            return HttpResponse.json(createdSprint, { status: 201 });
        }),
        http.patch("/api/sprints/:sprintId/", async ({ params, request }) => {
            const sprintId = Number(params.sprintId);
            const existingSprint = sprints.find((sprint) => sprint.id === sprintId);
            if (!existingSprint) {
                return HttpResponse.json({ detail: "Sprint not found." }, { status: 404 });
            }

            const payload = await request.json() as Partial<SprintPayload>;
            const updatedSprint = { ...existingSprint, ...payload };
            sprints = sprints.map((sprint) =>
                sprint.id === sprintId ? updatedSprint : sprint
            );
            return HttpResponse.json(updatedSprint);
        }),
        http.delete("/api/sprints/:sprintId/", ({ params }) => {
            const sprintId = Number(params.sprintId);
            if (!sprints.some((sprint) => sprint.id === sprintId)) {
                return HttpResponse.json({ detail: "Sprint not found." }, { status: 404 });
            }

            sprints = sprints.filter((sprint) => sprint.id !== sprintId);
            return new HttpResponse(null, { status: 204 });
        }),
        http.get(API_ENDPOINTS.TEAMS, () => HttpResponse.json(teams)),
        http.get(`${API_ENDPOINTS.TEAMS}capacity/`, () =>
            HttpResponse.json(capacities)
        ),
    ];
}
