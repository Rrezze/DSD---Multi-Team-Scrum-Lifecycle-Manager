import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { server } from "../../../tests/mocks/server";
import { BacklogRoute, LoginRoute } from "../sessionRoutes";
import { saveSessionUser } from "../loginSession";
import { loginUser } from "./login.fixtures";

function openRoute(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/login" element={<LoginRoute />} />
                <Route path="/productbacklog" element={<BacklogRoute />} />
            </Routes>
        </MemoryRouter>
    );
}

describe("Login session routing", () => {
    beforeEach(() => {
        sessionStorage.clear();
        server.use(http.get(API_ENDPOINTS.TEAMS, () => HttpResponse.json([])));
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
        expect(screen.getByRole("heading", { name: "Product Backlog" })).toBeVisible();
        fireEvent.click(screen.getByRole("button", { name: "Log out" }));
        expect(await screen.findByRole("heading", { name: "Log in" })).toBeVisible();
        expect(sessionStorage.getItem("scrumflow.user")).toBeNull();
        page.unmount();
        openRoute("/productbacklog");
        expect(await screen.findByRole("heading", { name: "Log in" })).toBeVisible();
    });
});
