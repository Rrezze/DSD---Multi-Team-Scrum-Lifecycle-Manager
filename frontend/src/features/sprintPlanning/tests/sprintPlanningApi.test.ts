import { beforeEach, describe, expect, it } from "vitest";

import { server } from "../../../tests/mocks/server";
import { backlogTickets } from "../../productBacklog/tests/productBacklog.fixtures";
import {
    capacityFixtures,
    sprintFixtures,
    sprintPayloadFixture,
    teamFixtures,
} from "./sprintPlanning.fixtures";
import { createSprintPlanningHandlers } from "./sprintPlanning.handlers";
import {
    createSprint,
    deleteSprint,
    getSprintPlanningData,
    getSprints,
    updateSprint,
} from "../sprintPlanningApi";

describe("sprintPlanningApi", () => {
    beforeEach(() => {
        server.resetHandlers();
        server.use(
            ...createSprintPlanningHandlers({
                teams: teamFixtures,
                capacities: capacityFixtures,
            })
        );
    });

    it("fetches the sprint list", async () => {
        await expect(getSprints()).resolves.toEqual(sprintFixtures);
    });

    it("creates a sprint", async () => {
        const createdSprint = await createSprint(sprintPayloadFixture);

        expect(createdSprint).toEqual({
            id: 8,
            ...sprintPayloadFixture,
        });
    });

    it("updates a sprint", async () => {
        const updatedSprint = await updateSprint(5, {
            ...sprintPayloadFixture,
            name: "Sprint 5 updated",
        });

        expect(updatedSprint).toEqual({
            ...sprintFixtures[2],
            ...sprintPayloadFixture,
            name: "Sprint 5 updated",
        });
    });

    it("deletes a sprint from the sprint list", async () => {
        await deleteSprint(5);

        await expect(getSprints()).resolves.toEqual(
            sprintFixtures.filter((sprint) => sprint.id !== 5)
        );
    });

    it("loads backlog tickets, teams, and sprint capacities", async () => {
        const planningData = await getSprintPlanningData(5);

        expect(planningData.tickets).toEqual(backlogTickets);
        expect(planningData.teams).toEqual([
            {
                id: 1,
                name: "Platform",
                description: "",
                is_active: true,
                capacity_points: 30,
            },
            {
                id: 2,
                name: "Integration",
                description: "",
                is_active: true,
                capacity_points: 25,
            },
        ]);
    });
});
