import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

import Users from "../users";

function dateOffset(offset: number) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

describe("Users", () => {
    it("creates a user, shows its details, and allows editing", () => {
        render(<Users />);

        expect(screen.getByText("No users have been added yet.")).toBeInTheDocument();
        expect(screen.queryByText("Showing 0 of 0 users")).not.toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Total members" })
        ).toBeInTheDocument();
        expect(screen.getByText("0", { selector: "strong" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
        fireEvent.change(screen.getByLabelText(/Name/i), {
            target: { value: "Ada Lovelace" },
        });
        expect(screen.getByLabelText(/^Role \*$/)).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: "Create User" }));

        expect(screen.getByText("User created successfully!")).toBeInTheDocument();
        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(
            screen.getByRole("row", { name: "View Ada Lovelace" })
        ).toHaveTextContent("Developer");
        expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
        expect(
            screen.queryByRole("columnheader", { name: "ACTIONS" })
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("row", { name: "View Ada Lovelace" }));
        expect(screen.getByRole("dialog")).toHaveTextContent("Developer");

        fireEvent.click(screen.getByRole("button", { name: "Edit User" }));
        fireEvent.change(screen.getByLabelText(/Name/i), {
            target: { value: "Ada Byron" },
        });
        expect(screen.getByLabelText(/^Role \*$/)).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(screen.getByText("User updated successfully!")).toBeInTheDocument();
        expect(screen.getByText("Ada Byron")).toBeInTheDocument();
        expect(
            screen.getByRole("row", { name: "View Ada Byron" })
        ).toHaveTextContent("Developer");
        expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    });

    it("requires a name before creating a user", () => {
        render(<Users />);

        fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
        fireEvent.click(screen.getByRole("button", { name: "Create User" }));

        expect(screen.getByText("Name is required.")).toBeInTheDocument();
    });

    it("closes both user dialogs from the Manage Unavailability close button", () => {
        render(<Users />);

        fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
        fireEvent.change(screen.getByLabelText(/Name/i), {
            target: { value: "Ada Lovelace" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create User" }));
        fireEvent.click(screen.getByRole("row", { name: "View Ada Lovelace" }));
        fireEvent.click(
            screen.getByRole("button", { name: "Manage Availability" })
        );

        expect(
            screen.getByRole("heading", { name: "Manage Unavailability" })
        ).toBeInTheDocument();

        const closeButtons = screen.getAllByRole("button", {
            name: "Close modal",
        });
        fireEvent.click(closeButtons[closeButtons.length - 1]);

        expect(
            screen.queryByRole("heading", { name: "Manage Unavailability" })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("searches users by name or role and clears the search", () => {
        render(<Users />);

        const createUser = (name: string) => {
            fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
            fireEvent.change(screen.getByLabelText(/Name/i), {
                target: { value: name },
            });
            fireEvent.click(screen.getByRole("button", { name: "Create User" }));
        };

        createUser("Ada Lovelace");
        createUser("Grace Hopper");

        const searchInput = screen.getByRole("textbox", {
            name: "Search users",
        });

        fireEvent.change(searchInput, { target: { value: "developer" } });
        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(screen.getByText("Grace Hopper")).toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: "ada" } });
        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    });

    it("adds multiple upcoming unavailability periods and removes a selected period", () => {
        const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
        render(<Users />);

        fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
        fireEvent.change(screen.getByLabelText(/Name/i), {
            target: { value: "Ada Lovelace" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create User" }));
        fireEvent.click(screen.getByRole("row", { name: "View Ada Lovelace" }));
        fireEvent.click(
            screen.getByRole("button", { name: "Manage Availability" })
        );

        const firstStart = dateOffset(2);
        const firstEnd = dateOffset(4);
        fireEvent.change(screen.getByLabelText(/^Start date/), {
            target: { value: firstStart },
        });
        fireEvent.change(screen.getByLabelText(/^End date/), {
            target: { value: firstEnd },
        });
        fireEvent.click(screen.getByRole("button", { name: "+ Add Period" }));

        expect(
            screen.queryByRole("heading", {
                name: "Manage Unavailability",
            })
        ).not.toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("button", { name: "Manage Availability" })
        );
        const secondStart = dateOffset(8);
        const secondEnd = dateOffset(10);
        fireEvent.change(screen.getByLabelText(/^Start date/), {
            target: { value: secondStart },
        });
        fireEvent.change(screen.getByLabelText(/^End date/), {
            target: { value: secondEnd },
        });
        fireEvent.click(screen.getByRole("button", { name: "+ Add Period" }));

        expect(
            screen.getByRole("button", {
                name: `Remove unavailability ${firstStart} to ${firstEnd}`,
            })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", {
                name: `Remove unavailability ${secondStart} to ${secondEnd}`,
            })
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("button", {
                name: `Remove unavailability ${firstStart} to ${firstEnd}`,
            })
        );

        expect(
            screen.queryByRole("button", {
                name: `Remove unavailability ${firstStart} to ${firstEnd}`,
            })
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", {
                name: `Remove unavailability ${secondStart} to ${secondEnd}`,
            })
        ).toBeInTheDocument();
        expect(consoleLog).toHaveBeenLastCalledWith(
            "User unavailability periods:",
            [{ id: 2, startDate: secondStart, endDate: secondEnd }]
        );
        consoleLog.mockRestore();
    });
});
