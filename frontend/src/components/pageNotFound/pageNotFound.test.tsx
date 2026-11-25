import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routes } from "../../router";

describe("PageNotFound route", () => {
    it("renders a 404 within the main layout and keeps the sidebar visible", () => {
        const router = createMemoryRouter(routes, {
            initialEntries: ["/unknown-page"],
        });

        render(<RouterProvider router={router} />);

        expect(
            screen.getByRole("heading", { name: "Page not found" })
        ).toBeInTheDocument();
        expect(screen.getByText("404")).toBeInTheDocument();
        expect(screen.getByRole("complementary")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Back to product backlog" })
        ).toHaveAttribute("href", "/productbacklog");

        router.dispose();
    });
});
