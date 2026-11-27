import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import API_ENDPOINTS from "../../constants/apiEndPoints";
import { server } from "../../tests/mocks/server";
import { backlogTickets } from "../productBacklog/tests/productBacklog.fixtures";
import SprintPlanning from "./sprintPlanning";
import { addCalendarDays, formatSprintDate, getTodayDateInputValue } from "./sprintPlanningUtils";
import dropStyles from "./components/sprintTasks/sprintTasks.module.css";
import ticketStyles from "./components/sprintTickets/sprintTickets.module.css";

describe("Sprint Planning", () => {
    it("adds a backlog ticket when dropped into the sprint without a team selected", async () => {
        server.use(
            http.get(API_ENDPOINTS.SPRINTS, () => HttpResponse.json([
                { id: 3, name: "Sprint 3", start_date: "2026-11-02", end_date: "2026-11-15", goal: "" },
                { id: 4, name: "Sprint 4", start_date: "2026-11-16", end_date: "2026-11-29", goal: "" },
                { id: 5, name: "Sprint 5", start_date: "2026-11-30", end_date: "2026-12-13", goal: "" },
                { id: 6, name: "Sprint 6", start_date: "2026-12-14", end_date: "2026-12-27", goal: "" },
                { id: 7, name: "Sprint 7", start_date: "2026-12-28", end_date: "2027-01-10", goal: "" },
            ])),
            http.get(API_ENDPOINTS.TICKETS, () => HttpResponse.json(backlogTickets)),
            http.get(API_ENDPOINTS.TEAMS, () => HttpResponse.json([])),
            http.get("/api/teams/capacity/", () => HttpResponse.json([]))
        );
        render(<SprintPlanning />);

        const backlog = await screen.findByRole("region", { name: "Backlog items" });
        const sprintSelect = screen.getByRole("combobox", { name: "Select sprint" });
        expect(within(sprintSelect).getAllByRole("option")).toHaveLength(5);
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
            http.get(API_ENDPOINTS.SPRINTS, () => HttpResponse.json([
                {
                    id: 5,
                    name: "Sprint 5",
                    start_date: "2026-11-30",
                    end_date: "2026-12-13",
                    goal: "",
                },
            ])),
            http.get(API_ENDPOINTS.TICKETS, () => HttpResponse.json(backlogTickets)),
            http.get(API_ENDPOINTS.TEAMS, () => HttpResponse.json([
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
            ])),
            http.get("/api/teams/capacity/", () => HttpResponse.json([
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
            ]))
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
        let sprints = [
            {
                id: 5,
                name: "Sprint 5",
                start_date: existingStartDate,
                end_date: existingEndDate,
                goal: "Ship the release",
            },
        ];

        server.use(
            http.get(API_ENDPOINTS.SPRINTS, () => HttpResponse.json(sprints)),
            http.get(API_ENDPOINTS.TICKETS, () => HttpResponse.json(backlogTickets)),
            http.get(API_ENDPOINTS.TEAMS, () => HttpResponse.json([])),
            http.get("/api/teams/capacity/", () => HttpResponse.json([])),
            http.post(API_ENDPOINTS.SPRINTS, async ({ request }) => {
                const payload = await request.json() as {
                    name: string;
                    start_date: string;
                    end_date: string;
                    goal: string;
                };
                const created = { id: 8, ...payload };
                sprints = [...sprints, created];
                return HttpResponse.json(created, { status: 201 });
            }),
            http.patch(API_ENDPOINTS.SPRINT_DETAIL(8), async ({ request }) => {
                const payload = await request.json() as Partial<typeof sprints[number]>;
                sprints = sprints.map((sprint) =>
                    sprint.id === 8 ? { ...sprint, ...payload } : sprint
                );
                return HttpResponse.json(sprints.find((sprint) => sprint.id === 8));
            }),
            http.delete(API_ENDPOINTS.SPRINT_DETAIL(8), () => {
                sprints = sprints.filter((sprint) => sprint.id !== 8);
                return new HttpResponse(null, { status: 204 });
            })
        );
        render(<SprintPlanning />);

        fireEvent.click(await screen.findByRole("button", { name: "+ New sprint" }));
        fireEvent.change(screen.getByRole("textbox", { name: /Sprint name/i }), {
            target: { value: "Sprint 8" },
        });
        fireEvent.change(screen.getByLabelText(/^Start date/i), {
            target: { value: startDate },
        });
        fireEvent.change(screen.getByRole("textbox", { name: /Sprint goal/i }), {
            target: { value: "Finish the roadmap" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create sprint" }));

        expect(await screen.findByRole("option", { name: "Sprint 8" })).toBeInTheDocument();
        expect(screen.getByRole("combobox", { name: "Select sprint" })).toHaveValue("8");
        expect(screen.getByText("2 weeks · Planning")).toBeInTheDocument();
        expect(await screen.findByRole("status")).toHaveTextContent("Sprint created successfully.");

        const backlog = await screen.findByRole("region", { name: "Backlog items" });
        fireEvent.click(
            await within(backlog).findByRole("button", { name: "Add Implement login to sprint" })
        );

        fireEvent.click(screen.getByRole("button", { name: "Sprint options" }));
        fireEvent.click(await screen.findByRole("button", { name: "Edit sprint" }));
        fireEvent.change(screen.getByRole("textbox", { name: /Sprint name/i }), {
            target: { value: "Sprint 8 Updated" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByRole("option", { name: "Sprint 8 Updated" })).toBeInTheDocument();
        expect(await screen.findByRole("status")).toHaveTextContent("Sprint updated successfully.");

        fireEvent.click(screen.getByRole("button", { name: "Sprint options" }));
        fireEvent.click(await screen.findByRole("button", { name: "Delete sprint" }));
        const confirmation = screen.getByRole("dialog");
        expect(
            within(confirmation).getByRole("heading", { name: "Delete Sprint 8 Updated?" })
        ).toBeInTheDocument();
        expect(confirmation).toHaveTextContent(
            `Sprint 8 Updated (${formatSprintDate(startDate)} – ${formatSprintDate(endDate)}) has not started yet.`
        );
        expect(confirmation).toHaveTextContent(
            "Its 1 planned ticket from all teams will go back to the product backlog."
        );
        expect(confirmation).toHaveTextContent("The sprint will be removed for all teams.");
        fireEvent.click(within(confirmation).getByRole("button", { name: "Delete sprint" }));

        await screen.findByRole("option", { name: "Sprint 5" });
        expect(screen.queryByRole("option", { name: "Sprint 8 Updated" })).not.toBeInTheDocument();
        expect(within(backlog).getByText("Implement login")).toBeInTheDocument();
        expect(await screen.findByRole("status")).toHaveTextContent("Sprint deleted successfully.");
    });

    it("does not offer delete for a sprint that has already started", async () => {
        const startDate = getTodayDateInputValue();
        const endDate = addCalendarDays(startDate, 13);
        server.use(
            http.get(API_ENDPOINTS.SPRINTS, () => HttpResponse.json([
                {
                    id: 5,
                    name: "Sprint 5",
                    start_date: startDate,
                    end_date: endDate,
                    goal: "",
                },
            ])),
            http.get(API_ENDPOINTS.TICKETS, () => HttpResponse.json(backlogTickets)),
            http.get(API_ENDPOINTS.TEAMS, () => HttpResponse.json([])),
            http.get("/api/teams/capacity/", () => HttpResponse.json([]))
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
