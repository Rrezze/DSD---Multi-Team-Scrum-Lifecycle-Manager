import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import API_ENDPOINTS from "../../constants/apiEndPoints";
import { server } from "../../tests/mocks/server";
import { backlogTickets } from "../productBacklog/tests/productBacklog.fixtures";
import SprintPlanning from "./sprintPlanning";
import dropStyles from "./components/sprintTasks/sprintTasks.module.css";
import ticketStyles from "./components/sprintTickets/sprintTickets.module.css";

describe("Sprint Planning", () => {
    it("adds a backlog ticket when dropped into the sprint without a team selected", async () => {
        server.use(
            http.get(API_ENDPOINTS.TICKETS, () => HttpResponse.json(backlogTickets)),
            http.get(API_ENDPOINTS.TEAMS, () => HttpResponse.json([]))
        );
        render(<SprintPlanning />);

        const backlog = await screen.findByRole("region", { name: "Backlog items" });
        const sprintSelect = screen.getByRole("combobox", { name: "Select sprint" });
        expect(within(sprintSelect).getAllByRole("option")).toHaveLength(5);
        fireEvent.change(sprintSelect, { target: { value: "6" } });
        expect(screen.getByText("14/12/2026 – 27/12/2026")).toBeInTheDocument();
        fireEvent.change(sprintSelect, { target: { value: "5" } });

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
        const ticketHeading = within(backlog).getByRole("heading", {
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
            http.get(API_ENDPOINTS.TICKETS, () => HttpResponse.json(backlogTickets)),
            http.get(API_ENDPOINTS.TEAMS, () => HttpResponse.json([
                {
                    id: 1,
                    name: "Platform",
                    description: "",
                    is_active: true,
                    base_capacity_points: 30,
                },
                {
                    id: 2,
                    name: "Integration",
                    description: "",
                    is_active: true,
                    base_capacity_points: 25,
                },
            ]))
        );
        render(<SprintPlanning />);

        const backlog = await screen.findByRole("region", { name: "Backlog items" });
        fireEvent.click(
            within(backlog).getByRole("button", { name: "Add Implement login to sprint" })
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
});
