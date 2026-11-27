
import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { server } from "../../../tests/mocks/server";

import {
    createTeam,
    createMembership,
    deleteTeam,
    deleteMembership,
    getMemberships,
    getTeamCapacities,
    getTeams,
    updateMembership,
    updateTeam,
} from "../teamsApi";

import type {
    ApiMembership,
    ApiTeam,
    ApiTeamCapacity,
    CreateMembershipPayload,
    CreateTeamPayload,
    UpdateMembershipPayload,
} from "../teamsApi";

const team: ApiTeam = {
    id: 1,
    name: "Platform Team",
    description: "Platform development",
    is_active: true,
};

const secondTeam: ApiTeam = {
    id: 2,
    name: "Data Team",
    description: "Data engineering",
    is_active: true,
};

const membership: ApiMembership = {
    id: 10,
    user: 4,
    team: 1,
    sprint: 1,
    role: "DEVELOPER",
    available_hours: 80,
    absent_hours: 0,
    capacity_points: 10,
};

const capacity: ApiTeamCapacity = {
    team: 1,
    team_name: "Platform Team",
    capacity_points: 10,
    members: [
        {
            membership: 10,
            user: 4,
            capacity_points: 10,
        },
    ],
};

const createTeamPayload: CreateTeamPayload = {
    name: "New Team",
    description: "New team description",
};

const createMembershipPayload: CreateMembershipPayload = {
    user: 4,
    team: 1,
    sprint: 1,
};

const updateMembershipPayload: UpdateMembershipPayload = {
    available_hours: 72,
};

describe("teamsApi", () => {
    beforeEach(() => {
        server.resetHandlers();
    });

    it("fetches active teams", async () => {
        let receivedUrl: URL | undefined;

        server.use(
            http.get(API_ENDPOINTS.TEAMS, ({ request }) => {
                receivedUrl = new URL(request.url);
                return HttpResponse.json([team, secondTeam]);
            })
        );

        await expect(getTeams()).resolves.toEqual([team, secondTeam]);

        expect(receivedUrl?.searchParams.get("active")).toBe("true");
    });

    it("creates a team using the supplied payload", async () => {
        let receivedPayload: unknown;

        const createdTeam = { ...team, ...createTeamPayload };

        server.use(
            http.post(API_ENDPOINTS.TEAMS, async ({ request }) => {
                receivedPayload = await request.json();

                return HttpResponse.json(createdTeam, {
                    status: 201,
                });
            })
        );

        await expect(createTeam(createTeamPayload)).resolves.toEqual(
            createdTeam
        );

        expect(receivedPayload).toEqual(createTeamPayload);
    });

    it("updates a team using PATCH", async () => {
        let receivedMethod = "";
        let receivedPayload: unknown;

        server.use(
            http.patch(
                `${API_ENDPOINTS.TEAMS}:teamId/`,
                async ({ request, params }) => {
                    receivedMethod = request.method;
                    receivedPayload = await request.json();

                    return HttpResponse.json({
                        ...team,
                        id: Number(params.teamId),
                        name: "Updated Platform Team",
                    });
                }
            )
        );

        await expect(
            updateTeam(1, { name: "Updated Platform Team" })
        ).resolves.toMatchObject({
            id: 1,
            name: "Updated Platform Team",
        });

        expect(receivedMethod).toBe("PATCH");
        expect(receivedPayload).toEqual({
            name: "Updated Platform Team",
        });
    });

    it("deactivates a team using DELETE", async () => {
        let receivedMethod = "";

        server.use(
            http.delete(`${API_ENDPOINTS.TEAMS}:teamId/`, ({ request }) => {
                receivedMethod = request.method;

                return new HttpResponse(null, { status: 204 });
            })
        );

        await expect(deleteTeam(1)).resolves.toBeUndefined();
        expect(receivedMethod).toBe("DELETE");
    });

    it("fetches memberships with user and sprint filters", async () => {
        let receivedUrl: URL | undefined;

        server.use(
            http.get("/api/memberships/", ({ request }) => {
                receivedUrl = new URL(request.url);

                return HttpResponse.json([membership]);
            })
        );

        await expect(getMemberships(4, 1)).resolves.toEqual([membership]);

        expect(receivedUrl?.searchParams.get("user")).toBe("4");
        expect(receivedUrl?.searchParams.get("sprint")).toBe("1");
    });

    it("fetches memberships without optional filters", async () => {
        let receivedUrl: URL | undefined;

        server.use(
            http.get("/api/memberships/", ({ request }) => {
                receivedUrl = new URL(request.url);

                return HttpResponse.json([membership]);
            })
        );

        await expect(getMemberships()).resolves.toEqual([membership]);

        expect(receivedUrl?.search).toBe("");
    });

    it("fetches calculated team capacities for a sprint", async () => {
        let receivedUrl: URL | undefined;

        server.use(
            http.get(
                `${API_ENDPOINTS.TEAMS}capacity/`,
                ({ request }) => {
                    receivedUrl = new URL(request.url);

                    return HttpResponse.json([capacity]);
                }
            )
        );

        await expect(getTeamCapacities(1)).resolves.toEqual([capacity]);

        expect(receivedUrl?.searchParams.get("sprint")).toBe("1");
    });

    it("creates a membership using the supplied payload", async () => {
        let receivedPayload: unknown;

        server.use(
            http.post("/api/memberships/", async ({ request }) => {
                receivedPayload = await request.json();

                return HttpResponse.json(membership, {
                    status: 201,
                });
            })
        );

        await expect(
            createMembership(createMembershipPayload)
        ).resolves.toEqual(membership);

        expect(receivedPayload).toEqual(createMembershipPayload);
    });

    it("updates a membership using PATCH", async () => {
        let receivedMethod = "";
        let receivedPayload: unknown;

        server.use(
            http.patch(
                "/api/memberships/:membershipId/",
                async ({ request, params }) => {
                    receivedMethod = request.method;
                    receivedPayload = await request.json();

                    return HttpResponse.json({
                        ...membership,
                        id: Number(params.membershipId),
                        available_hours: 72,
                    });
                }
            )
        );

        await expect(
            updateMembership(10, updateMembershipPayload)
        ).resolves.toMatchObject({
            id: 10,
            available_hours: 72,
        });

        expect(receivedMethod).toBe("PATCH");
        expect(receivedPayload).toEqual(updateMembershipPayload);
    });

    it("deletes a membership using DELETE", async () => {
        let receivedMethod = "";

        server.use(
            http.delete(
                "/api/memberships/:membershipId/",
                ({ request }) => {
                    receivedMethod = request.method;

                    return new HttpResponse(null, { status: 204 });
                }
            )
        );

        await expect(deleteMembership(10)).resolves.toBeUndefined();

        expect(receivedMethod).toBe("DELETE");
    });

    it("throws the backend validation message when team creation fails", async () => {
        server.use(
            http.post(API_ENDPOINTS.TEAMS, () =>
                HttpResponse.json(
                    { name: ["A team with this name already exists."] },
                    { status: 400 }
                )
            )
        );

        await expect(createTeam(createTeamPayload)).rejects.toThrow(
            "A team with this name already exists."
        );
    });

    it("throws an error when the teams response is not an array", async () => {
        server.use(
            http.get(API_ENDPOINTS.TEAMS, () =>
                HttpResponse.json({ results: [team] })
            )
        );

        await expect(getTeams()).rejects.toThrow(
            "Invalid teams response."
        );
    });

    it("throws an error when the memberships response is not an array", async () => {
        server.use(
            http.get("/api/memberships/", () =>
                HttpResponse.json({ results: [membership] })
            )
        );

        await expect(getMemberships()).rejects.toThrow(
            "Invalid memberships response."
        );
    });

    it("throws an error when the capacity response is not an array", async () => {
        server.use(
            http.get(`${API_ENDPOINTS.TEAMS}capacity/`, () =>
                HttpResponse.json({ results: [capacity] })
            )
        );

        await expect(getTeamCapacities(1)).rejects.toThrow(
            "Invalid team capacity response."
        );
    });

    it("handles a backend error when deleting a team", async () => {
        server.use(
            http.delete(`${API_ENDPOINTS.TEAMS}:teamId/`, () =>
                HttpResponse.json(
                    { detail: "This team cannot be deactivated." },
                    { status: 400 }
                )
            )
        );

        await expect(deleteTeam(1)).rejects.toThrow(
            "This team cannot be deactivated."
        );
    });

    it("rejects a malformed response when creating a team", async () => {
        server.use(
            http.post(API_ENDPOINTS.TEAMS, () =>
                HttpResponse.json({ name: "Missing ID" }, { status: 201 })
            )
        );

        await expect(createTeam(createTeamPayload)).rejects.toThrow(
            "Invalid created team response."
        );
    });

    it("rejects a malformed response when updating a team", async () => {
        server.use(
            http.patch(`${API_ENDPOINTS.TEAMS}:teamId/`, () =>
                HttpResponse.json({ description: "Missing required fields" })
            )
        );

        await expect(
            updateTeam(1, { description: "Changed" })
        ).rejects.toThrow("Invalid updated team response.");
    });

    it("rejects a malformed response when creating a membership", async () => {
        server.use(
            http.post("/api/memberships/", () =>
                HttpResponse.json({ user: 4, team: 1 }, { status: 201 })
            )
        );

        await expect(
            createMembership(createMembershipPayload)
        ).rejects.toThrow("Invalid created membership response.");
    });

    it("rejects a malformed response when updating a membership", async () => {
        server.use(
            http.patch("/api/memberships/:membershipId/", () =>
                HttpResponse.json({ available_hours: 72 })
            )
        );

        await expect(
            updateMembership(10, updateMembershipPayload)
        ).rejects.toThrow("Invalid updated membership response.");
    });

    it("handles a backend error when creating a membership", async () => {
        server.use(
            http.post("/api/memberships/", () =>
                HttpResponse.json(
                    { detail: "Developer is already assigned." },
                    { status: 400 }
                )
            )
        );

        await expect(
            createMembership(createMembershipPayload)
        ).rejects.toThrow("Developer is already assigned.");
    });

    it("handles a backend error when updating a membership", async () => {
        server.use(
            http.patch("/api/memberships/:membershipId/", () =>
                HttpResponse.json(
                    { detail: "Membership cannot be updated." },
                    { status: 400 }
                )
            )
        );

        await expect(
            updateMembership(10, updateMembershipPayload)
        ).rejects.toThrow("Membership cannot be updated.");
    });

    it("handles a backend error when deleting a membership", async () => {
        server.use(
            http.delete("/api/memberships/:membershipId/", () =>
                HttpResponse.json(
                    { detail: "Membership cannot be removed." },
                    { status: 400 }
                )
            )
        );

        await expect(deleteMembership(10)).rejects.toThrow(
            "Membership cannot be removed."
        );
    });

});
