import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../login";

function openLogin() {
    render(
        <MemoryRouter initialEntries={["/login"]}>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/productbacklog" element={<h1>Product Backlog</h1>} />
            </Routes>
        </MemoryRouter>
    );
    return screen.getByRole("textbox", { name: "Username" });
}

describe("Login", () => {
    beforeEach(() => sessionStorage.clear());

    it("focuses the username and announces a blank field", () => {
        const field = openLogin();
        fireEvent.click(screen.getByRole("button", { name: "Log in" }));
        expect(field).toHaveFocus();
        expect(field).toHaveAccessibleDescription("Enter your username.");
        expect(screen.getByRole("alert")).toHaveTextContent("Enter your username.");
    });

    it("keeps unknown users on the login screen and announces the error", async () => {
        const field = openLogin();
        fireEvent.change(field, { target: { value: "unknown" } });
        fireEvent.click(screen.getByRole("button", { name: "Log in" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("User not found.");
        expect(sessionStorage.getItem("scrumflow.user")).toBeNull();
        expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
    });

    it("saves the returned identity for this tab and navigates to the backlog", async () => {
        const field = openLogin();
        fireEvent.change(field, { target: { value: "ana" } });
        fireEvent.click(screen.getByRole("button", { name: "Log in" }));
        expect(await screen.findByRole("heading", { name: "Product Backlog" })).toBeVisible();
        expect(JSON.parse(sessionStorage.getItem("scrumflow.user")!)).toEqual({
            username: "ana", name: "Ana Dev", role: "DEVELOPER",
            permissions: { canCreateTickets: false, canReorderTickets: false },
        });
    });
});
