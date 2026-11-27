import type { ApiTeam, ApiTeamCapacity } from "../../teams/teamsApi";
import type { ApiSprint, SprintPayload } from "../sprintPlanningTypes";

export const sprintPayloadFixture: SprintPayload = {
    name: "Sprint API test",
    start_date: "2027-01-11",
    end_date: "2027-01-24",
    goal: "Verify sprint API operations",
};

export const sprintFiveFixture: ApiSprint = {
    id: 5,
    name: "Sprint 5",
    start_date: "2026-11-30",
    end_date: "2026-12-13",
    goal: "",
};

export const sprintFixtures: ApiSprint[] = [
    { id: 3, name: "Sprint 3", start_date: "2026-11-02", end_date: "2026-11-15", goal: "" },
    { id: 4, name: "Sprint 4", start_date: "2026-11-16", end_date: "2026-11-29", goal: "" },
    sprintFiveFixture,
    { id: 6, name: "Sprint 6", start_date: "2026-12-14", end_date: "2026-12-27", goal: "" },
    { id: 7, name: "Sprint 7", start_date: "2026-12-28", end_date: "2027-01-10", goal: "" },
];

export const teamFixtures: ApiTeam[] = [
    {
        id: 1,
        name: "Platform",
        description: "",
        is_active: true,
    },
    {
        id: 2,
        name: "Integration",
        description: "",
        is_active: true,
    },
];

export const capacityFixtures: ApiTeamCapacity[] = [
    {
        team: 1,
        team_name: "Platform",
        capacity_points: 30,
        members: [],
    },
    {
        team: 2,
        team_name: "Integration",
        capacity_points: 25,
        members: [],
    },
];
