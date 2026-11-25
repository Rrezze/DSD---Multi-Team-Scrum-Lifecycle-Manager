import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { http, HttpResponse } from "msw";
import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { server } from "../../../tests/mocks/server";
import { routes } from "../../../router";
import { saveSessionUser } from "../loginSession";
import { loginUser } from "./login.fixtures";

function openRoute(path: string) {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    return render(<RouterProvider router={router} />);
}

describe("Login session routing", () => {
    beforeEach(() => {
        sessionStorage.clear();
        server.use(http.get(API_ENDPOINTS.TEAMS, () => HttpResponse.json([])));
    });

    it("keeps the shared shell across login and navigation to another protected page", async () => {
        openRoute("/teams");
        const username = await screen.findByRole("textbox", { name: "Username" });
        const header = screen.getByRole("banner");
        const sidebar = screen.getByRole("complementary");
        expect(screen.queryByRole("navigation")).toBeNull();
        expect(screen.queryByText("WORKSPACE")).toBeNull();
        expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
        fireEvent.change(username, { target: { value: loginUser.username } });
        fireEvent.click(screen.getByRole("button", { name: "Log in" }));
        await screen.findByRole("heading", { name: "Product Backlog" });
        fireEvent.click(screen.getByRole("link", { name: "Teams" }));
        expect(screen.getByRole("banner")).toBe(header);
        expect(screen.getByRole("complementary")).toBe(sidebar);
        expect(header).toHaveTextContent("Ana Dev · Developer");
        fireEvent.click(screen.getByRole("button", { name: "Log out" }));
        expect(await screen.findByRole("textbox", { name: "Username" })).toBeVisible();
    });

    it.each([null, "invalid JSON", '{"username":"ana","name":"Ana","role":"UNKNOWN"}'])(
        "redirects a direct backlog visit with an absent or invalid session (%s)", async (raw) => {
            if (raw) sessionStorage.setItem("scrumflow.user", raw);
            openRoute("/productbacklog");
            expect(await screen.findByRole("heading", { name: "Log in" })).toBeVisible();
            expect(screen.queryByRole("heading", { name: "Product Backlog" })).toBeNull();
        }
    );

    it.each([
        ["PRODUCT_OWNER", false, true],
        ["ENGINEERING_MANAGER", true, false],
        ["DEVELOPER", false, false],
    ] as const)("restores %s controls from a previous session", async (role, create, reorder) => {
        sessionStorage.setItem("scrumflow.user", JSON.stringify({ username: "ana", name: "Ana", role }));
        const page = openRoute("/productbacklog");
        await screen.findByText("Implement login");
        expect(Boolean(screen.queryByRole("button", { name: "+ Create Ticket" }))).toBe(create);
        expect(Boolean(screen.queryAllByRole("button", { name: /Drag ticket/ }).length)).toBe(reorder);
        const session = JSON.parse(sessionStorage.getItem("scrumflow.user")!);
        expect(session.permissions).toEqual({ canCreateTickets: create, canReorderTickets: reorder });
        page.unmount();
        openRoute("/productbacklog");
        await screen.findByText("Implement login");
        expect(Boolean(screen.queryByRole("button", { name: "+ Create Ticket" }))).toBe(create);
        expect(Boolean(screen.queryAllByRole("button", { name: /Drag ticket/ }).length)).toBe(reorder);
    });

    it("restores the user, logs out, and blocks a later backlog visit", async () => {
        saveSessionUser(loginUser);
        const page = openRoute("/login");
        expect(await screen.findByText("Ana Dev · Developer")).toBeVisible();
        expect(screen.getAllByRole("banner")).toHaveLength(1);
        expect(screen.getByRole("heading", { name: "Product Backlog" })).toBeVisible();
        fireEvent.click(screen.getByRole("button", { name: "Log out" }));
        expect(await screen.findByRole("heading", { name: "Log in" })).toBeVisible();
        expect(sessionStorage.getItem("scrumflow.user")).toBeNull();
        expect(screen.queryByRole("navigation")).toBeNull();
        page.unmount();
        openRoute("/productbacklog");
        expect(await screen.findByRole("heading", { name: "Log in" })).toBeVisible();
    });
});
