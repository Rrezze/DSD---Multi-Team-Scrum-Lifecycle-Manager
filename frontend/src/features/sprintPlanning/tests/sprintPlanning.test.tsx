import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { server } from "../../../tests/mocks/server";
import { capacityFixtures, sprintFiveFixture, sprintFixtures, teamFixtures } from "./sprintPlanning.fixtures";
import { createSprintPlanningHandlers } from "./sprintPlanning.handlers";
import SprintPlanning from "../sprintPlanning";
import { addCalendarDays, formatSprintDate, getTodayDateInputValue } from "../sprintPlanningUtils";
import dropStyles from "../components/sprintTasks/sprintTasks.module.css";
import ticketStyles from "../components/sprintTickets/sprintTickets.module.css";

describe("Sprint Planning", () => {
    beforeEach(() => {
        server.resetHandlers();
        server.use(...createSprintPlanningHandlers());
    });

    it("adds a backlog ticket when dropped into the sprint without a team selected", async () => {
        render(<SprintPlanning />);

        const backlog = await screen.findByRole("region", { name: "Backlog items" });
        const sprintSelect = screen.getByRole("combobox", { name: "Select sprint" });
        expect(within(sprintSelect).getAllByRole("option")).toHaveLength(sprintFixtures.length);
        fireEvent.change(sprintSelect, { target: { value: "6" } });
        expect(screen.getByText("14/12/2026 – 27/12/2026")).toBeInTheDocument();
        await screen.findByRole("button", { name: /Platform/ });
        fireEvent.change(sprintSelect, { target: { value: "5" } });
        await screen.findByRole("button", { name: /Platform/ });

        const capacity = screen.getByRole("region", { name: "Team capacity" });
        expect(
            within(capacity).getByRole("button", { name: /Platform/ })
        ).toHaveTextContent("0 / 37");
        expect(
            within(capacity).getByText("Sample team capacities for planning")
        ).toBeInTheDocument();
        fireEvent.change(screen.getByRole("combobox", { name: "Planning team" }), {
            target: { value: "" },
        });
        const ticketHeading = await within(backlog).findByRole("heading", {
            name: "Implement login",
        });
        const ticketCard = ticketHeading.closest("article");
        if (!ticketCard) throw new Error("Backlog ticket card was not rendered.");

        const storedData = new Map<string, string>();
        const dataTransfer = {
            setData: (type: string, value: string) => storedData.set(type, value),
            getData: (type: string) => storedData.get(type) ?? "",
            effectAllowed: "move",
        };
        fireEvent.dragStart(ticketCard, { dataTransfer });

        const sprintTasks = screen.getByRole("region", { name: "Sprint tasks" });
        const dropTarget = within(sprintTasks).getByText(/Drop a backlog ticket here/);
        fireEvent.dragEnter(sprintTasks, { dataTransfer });
        expect(dropTarget).toHaveClass(dropStyles.dropActive);
        fireEvent.drop(
            dropTarget,
            { dataTransfer }
        );

        expect(within(sprintTasks).getByRole("article")).toHaveClass(ticketStyles.newlyAdded);
        expect(within(sprintTasks).getByText("Implement login")).toBeInTheDocument();
        expect(within(backlog).queryByText("Implement login")).not.toBeInTheDocument();
    });

    it("loads team capacity and moves backlog tickets into and out of the draft", async () => {
        server.use(
            ...createSprintPlanningHandlers({
                sprints: [sprintFiveFixture],
                teams: teamFixtures,
                capacities: capacityFixtures,
            })
        );
        render(<SprintPlanning />);

        const backlog = await screen.findByRole("region", { name: "Backlog items" });
        fireEvent.click(
            await within(backlog).findByRole("button", { name: "Add Implement login to sprint" })
        );

        const sprintTasks = screen.getByRole("region", { name: "Sprint tasks" });
        expect(within(sprintTasks).getByText("Implement login")).toBeInTheDocument();
        expect(screen.getByText("5 / 30 pts")).toBeInTheDocument();
        expect(within(backlog).queryByText("Implement login")).not.toBeInTheDocument();

        fireEvent.click(
            within(sprintTasks).getByRole("button", { name: "Remove Implement login from sprint" })
        );

        expect(within(backlog).getByText("Implement login")).toBeInTheDocument();
        expect(screen.getByText("0 / 30 pts")).toBeInTheDocument();
    });

    it("creates, edits, and deletes a sprint", async () => {
        const existingStartDate = addCalendarDays(getTodayDateInputValue(), -14);
        const existingEndDate = addCalendarDays(getTodayDateInputValue(), -1);
        const startDate = addCalendarDays(getTodayDateInputValue(), 5);
        const endDate = addCalendarDays(startDate, 13);

        server.use(
            ...createSprintPlanningHandlers({
                sprints: [{
                    ...sprintFiveFixture,
                    start_date: existingStartDate,
                    end_date: existingEndDate,
                    goal: "Ship the release",
                }],
            })
        );
        render(<SprintPlanning />);

        fireEvent.click(await screen.findByRole("button", { name: "+ New sprint" }));
        fireEvent.change(screen.getByRole("textbox", { name: /Sprint name/i }), {
            target: { value: "Sprint 6" },
        });
        fireEvent.change(screen.getByLabelText(/^Start date/i), {
            target: { value: startDate },
        });
        fireEvent.change(screen.getByRole("textbox", { name: /Sprint goal/i }), {
            target: { value: "Finish the roadmap" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create sprint" }));

        expect(await screen.findByRole("option", { name: "Sprint 6" })).toBeInTheDocument();
        expect(screen.getByRole("combobox", { name: "Select sprint" })).toHaveValue("6");
        expect(screen.getByText("2 weeks · Planning")).toBeInTheDocument();
        expect(await screen.findByRole("status")).toHaveTextContent("Sprint created successfully.");

        const backlog = await screen.findByRole("region", { name: "Backlog items" });
        fireEvent.click(
            await within(backlog).findByRole("button", { name: "Add Implement login to sprint" })
        );

        fireEvent.click(screen.getByRole("button", { name: "Sprint options" }));
        fireEvent.click(await screen.findByRole("button", { name: "Edit sprint" }));
        fireEvent.change(screen.getByRole("textbox", { name: /Sprint name/i }), {
            target: { value: "Sprint 6 Updated" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByRole("option", { name: "Sprint 6 Updated" })).toBeInTheDocument();
        expect(await screen.findByRole("status")).toHaveTextContent("Sprint updated successfully.");

        fireEvent.click(screen.getByRole("button", { name: "Sprint options" }));
        fireEvent.click(await screen.findByRole("button", { name: "Delete sprint" }));
        const confirmation = screen.getByRole("dialog");
        expect(
            within(confirmation).getByRole("heading", { name: "Delete Sprint 6 Updated?" })
        ).toBeInTheDocument();
        expect(confirmation).toHaveTextContent(
            `Sprint 6 Updated (${formatSprintDate(startDate)} – ${formatSprintDate(endDate)}) has not started yet.`
        );
        expect(confirmation).toHaveTextContent(
            "Its 1 planned ticket from all teams will go back to the product backlog."
        );
        expect(confirmation).toHaveTextContent("The sprint will be removed for all teams.");
        fireEvent.click(within(confirmation).getByRole("button", { name: "Delete sprint" }));

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select sprint" })).toHaveValue("5");
            expect(screen.queryByRole("option", { name: "Sprint 6 Updated" })).not.toBeInTheDocument();
        });
        expect(within(backlog).getByText("Implement login")).toBeInTheDocument();
        expect(await screen.findByRole("status")).toHaveTextContent("Sprint deleted successfully.");
    });

    it("does not offer delete for a sprint that has already started", async () => {
        const startDate = getTodayDateInputValue();
        const endDate = addCalendarDays(startDate, 13);
        server.use(
            ...createSprintPlanningHandlers({
                sprints: [{
                    ...sprintFiveFixture,
                    start_date: startDate,
                    end_date: endDate,
                }],
            })
        );
        render(<SprintPlanning />);

        await screen.findByRole("option", { name: "Sprint 5" });
        expect(screen.getByText("2 weeks · Active")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Sprint options" }));
        expect(screen.getByRole("button", { name: "Edit sprint" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Delete sprint" })).not.toBeInTheDocument();
    });

    it("shows an error notification when sprint creation fails", async () => {
        server.use(
            http.get(API_ENDPOINTS.SPRINTS, () => HttpResponse.json([])),
            http.post(API_ENDPOINTS.SPRINTS, () =>
                HttpResponse.json({ detail: "Sprint creation failed." }, { status: 500 })
            )
        );
        render(<SprintPlanning />);

        fireEvent.click(await screen.findByRole("button", { name: "+ New sprint" }));
        fireEvent.change(screen.getByRole("textbox", { name: /Sprint name/i }), {
            target: { value: "Sprint that fails" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create sprint" }));

        const alerts = await screen.findAllByRole("alert");
        expect(alerts).toHaveLength(2);
        expect(alerts[0]).toHaveTextContent("Sprint creation failed.");
    });
});
