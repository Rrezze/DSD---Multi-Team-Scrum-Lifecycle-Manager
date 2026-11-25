import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";

import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { server } from "../../../tests/mocks/server";
import { UserRole } from "../usersTypes";
import Users from "../users";

let nextUserId = 1;
let nextAbsenceId = 1;

beforeEach(() => {
    nextUserId = 1;
    nextAbsenceId = 1;
    server.resetHandlers();
    server.use(
        http.get(API_ENDPOINTS.USERS, () => HttpResponse.json([])),
        http.post(API_ENDPOINTS.USERS, async ({ request }) => {
            const payload = await request.json() as Record<string, unknown>;
            return HttpResponse.json(
                {
                    id: nextUserId++,
                    ...payload,
                    role: payload.role ?? UserRole.DEVELOPER,
                    is_active: true,
                },
                { status: 201 }
            );
        }),
        http.delete("/api/users/:userId/", () =>
            new HttpResponse(null, { status: 204 })
        ),
        http.get("/api/users/:userId/absences/", () => HttpResponse.json([])),
        http.post("/api/users/:userId/absences/", async ({ params, request }) => {
            const payload = await request.json() as Record<string, unknown>;
            return HttpResponse.json(
                {
                    id: nextAbsenceId++,
                    user: Number(params.userId),
                    start_date: payload.start_date,
                    end_date: payload.end_date,
                    reason: payload.reason ?? "",
                    hours: payload.hours ?? null,
                },
                { status: 201 }
            );
        }),
        http.delete("/api/absences/:absenceId/", () =>
            new HttpResponse(null, { status: 204 })
        )
    );
});

async function renderUsers() {
    render(<Users />);
    await screen.findByText("No users have been added yet.");
}

function fillCreateUser(username: string, firstName: string) {
    fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
    fireEvent.change(screen.getByLabelText(/^Username \*$/), {
        target: { value: username },
    });
    fireEvent.change(screen.getByLabelText("First name"), {
        target: { value: firstName },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create User" }));
}

async function openUserDetails(name: string) {
    fireEvent.click(
        await screen.findByRole("row", { name: `View ${name}` })
    );
    await waitFor(() => {
        expect(
            screen.getByRole("button", { name: "Manage Unavailability" })
        ).toBeEnabled();
    });
}

function dateOffset(offset: number) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

describe("Users", () => {
    it("loads users from the API, creates a user, shows its details, and allows editing", async () => {
        server.use(
            http.get(API_ENDPOINTS.USERS, () =>
                HttpResponse.json([
                    {
                        id: 12,
                        username: "existing",
                        email: "existing@example.com",
                        first_name: "Existing",
                        last_name: "User",
                        role: UserRole.DEVELOPER,
                        is_active: true,
                    },
                ])
            ),
            http.get("/api/users/:userId/absences/", ({ params }) =>
                Number(params.userId) === 12
                    ? HttpResponse.json([
                        {
                            id: 33,
                            user: 12,
                            start_date: "2026-12-01",
                            end_date: "2026-12-02",
                            reason: "Holiday",
                            hours: null,
                        },
                    ])
                    : HttpResponse.json([])
            ),
            http.patch("/api/users/:userId/", async ({ params, request }) => {
                const payload = await request.json() as Record<string, unknown>;
                return HttpResponse.json({
                    id: Number(params.userId),
                    username: "ada",
                    email: payload.email,
                    first_name: payload.first_name,
                    last_name: payload.last_name,
                    role: UserRole.DEVELOPER,
                    is_active: true,
                });
            })
        );
        render(<Users />);

        expect(await screen.findByText("Existing User")).toBeInTheDocument();
        expect(
            screen.getByRole("row", { name: "View Existing User" })
        ).toHaveTextContent("existing");
        expect(
            screen.getByRole("row", { name: "View Existing User" })
        ).toHaveTextContent("1 period (2 days)");
        expect(screen.queryByRole("columnheader", { name: "ID" })).not.toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "USERNAME" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
        expect(
            within(screen.getByRole("dialog")).getByLabelText("Role")
        ).toBeDisabled();
        fireEvent.change(screen.getByLabelText(/^Username \*$/), {
            target: { value: "ada" },
        });
        fireEvent.change(screen.getByLabelText("First name"), {
            target: { value: "Ada" },
        });
        fireEvent.change(screen.getByLabelText("Last name"), {
            target: { value: "Lovelace" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create User" }));

        expect(await screen.findByText("User created successfully!")).toBeInTheDocument();
        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(
            screen.getByRole("row", { name: "View Ada Lovelace" })
        ).toHaveTextContent("Developer");
        expect(
            screen.getByRole("row", { name: "View Ada Lovelace" })
        ).toHaveTextContent("ada");
        expect(
            screen.getByRole("columnheader", { name: "ACTIONS" })
        ).toBeInTheDocument();
        expect(screen.getByText("2", { selector: "strong" })).toBeInTheDocument();

        await openUserDetails("Ada Lovelace");
        expect(screen.getByRole("dialog")).toHaveTextContent("Developer");

        fireEvent.click(screen.getByRole("button", { name: "Edit User" }));
        expect(
            screen.getByLabelText("Role", { selector: "#edit-user-role" })
        ).toBeDisabled();
        fireEvent.change(screen.getByLabelText("First name"), {
            target: { value: "Ada" },
        });
        fireEvent.change(screen.getByLabelText("Last name"), {
            target: { value: "Byron" },
        });
        fireEvent.change(screen.getByLabelText("Email"), {
            target: { value: "ada.byron@example.com" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(await screen.findByText("User updated successfully!")).toBeInTheDocument();
        expect(screen.getByText("Ada Byron")).toBeInTheDocument();
        expect(
            screen.getByRole("row", { name: "View Ada Byron" })
        ).toHaveTextContent("Developer");
        expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    });

    it("shows total unavailable days across all periods in the table", async () => {
        server.use(
            http.get(API_ENDPOINTS.USERS, () =>
                HttpResponse.json([
                    {
                        id: 21,
                        username: "ana",
                        email: "",
                        first_name: "Ana",
                        last_name: "Dev",
                        role: UserRole.DEVELOPER,
                        is_active: true,
                    },
                ])
            ),
            http.get("/api/users/:userId/absences/", () =>
                HttpResponse.json([
                    {
                        id: 31,
                        user: 21,
                        start_date: "2026-12-01",
                        end_date: "2026-12-07",
                        reason: "",
                        hours: null,
                    },
                    {
                        id: 32,
                        user: 21,
                        start_date: "2026-12-10",
                        end_date: "2026-12-16",
                        reason: "",
                        hours: null,
                    },
                ])
            )
        );
        render(<Users />);

        expect(
            await screen.findByRole("row", { name: "View Ana Dev" })
        ).toHaveTextContent("2 periods (14 days)");
    });

    it("sorts users by ascending ID without showing the ID column", async () => {
        server.use(
            http.get(API_ENDPOINTS.USERS, () =>
                HttpResponse.json([
                    {
                        id: 10,
                        username: "high-id",
                        email: "",
                        first_name: "High",
                        last_name: "ID",
                        role: UserRole.DEVELOPER,
                        is_active: true,
                    },
                    {
                        id: 2,
                        username: "low-id",
                        email: "",
                        first_name: "Low",
                        last_name: "ID",
                        role: UserRole.DEVELOPER,
                        is_active: true,
                    },
                ])
            )
        );
        render(<Users />);

        await screen.findByRole("row", { name: "View Low ID" });
        expect(
            screen.getAllByRole("row")
                .slice(1)
                .map((row) => row.getAttribute("aria-label"))
        ).toEqual(["View Low ID", "View High ID"]);
    });

    it("requires a username before creating a user", async () => {
        await renderUsers();

        fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
        fireEvent.click(screen.getByRole("button", { name: "Create User" }));

        expect(screen.getByText("Username is required.")).toBeInTheDocument();
    });

    it("confirms user deletion before removing the user from the table", async () => {
        server.use(
            http.get(API_ENDPOINTS.USERS, () =>
                HttpResponse.json([
                    {
                        id: 44,
                        username: "ana",
                        email: "",
                        first_name: "Ana",
                        last_name: "Dev",
                        role: UserRole.DEVELOPER,
                        is_active: true,
                    },
                ])
            )
        );
        render(<Users />);

        const row = await screen.findByRole("row", { name: "View Ana Dev" });
        fireEvent.click(screen.getByRole("button", { name: "Delete ana" }));

        expect(
            screen.getByText(
                (_, element) =>
                    element?.tagName === "P" &&
                    element.textContent?.replace(/\s+/g, " ").trim() ===
                        "Are you sure you want to delete ana?"
            )
        ).toBeInTheDocument();
        expect(row).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(row).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Delete ana" }));
        fireEvent.click(
            screen.getByRole("button", { name: /^Delete$/ })
        );

        await waitFor(() => {
            expect(
                screen.queryByRole("row", { name: "View Ana Dev" })
            ).not.toBeInTheDocument();
        });
    });

    it("loads existing absences for the selected user", async () => {
        server.use(
            http.get(API_ENDPOINTS.USERS, () =>
                HttpResponse.json([
                    {
                        id: 21,
                        username: "ana",
                        email: "ana@example.com",
                        first_name: "Ana",
                        last_name: "Dev",
                        role: UserRole.DEVELOPER,
                        is_active: true,
                    },
                ])
            ),
            http.get("/api/users/:userId/absences/", () =>
                HttpResponse.json([
                    {
                        id: 31,
                        user: 21,
                        start_date: dateOffset(3),
                        end_date: dateOffset(4),
                        reason: "Holiday",
                        hours: null,
                    },
                ])
            )
        );
        render(<Users />);

        fireEvent.click(await screen.findByRole("row", { name: "View Ana Dev" }));

        expect(await screen.findByText("Unavailability (1)")).toBeInTheDocument();
        expect(screen.getByText("Holiday")).toBeInTheDocument();
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("ana")).toBeInTheDocument();
        expect(within(dialog).getByText("Ana", { selector: "p" })).toBeInTheDocument();
        expect(within(dialog).getByText("Dev", { selector: "p" })).toBeInTheDocument();
        expect(within(dialog).getByText("ana@example.com")).toBeInTheDocument();
    });

    it("closes both user dialogs from the Manage Unavailability close button", async () => {
        await renderUsers();

        fillCreateUser("ada", "Ada");
        await screen.findByText("Ada");
        await openUserDetails("Ada");
        fireEvent.click(
            screen.getByRole("button", { name: "Manage Unavailability" })
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

    it("searches users by name or role and clears the search", async () => {
        await renderUsers();

        fillCreateUser("ada", "Ada Lovelace");
        await screen.findByText("Ada Lovelace");
        fillCreateUser("grace", "Grace Hopper");
        await screen.findByText("Grace Hopper");

        const searchInput = screen.getByRole("textbox", {
            name: "Search users",
        });
        const roleFilter = screen.getByLabelText("Role");

        fireEvent.change(roleFilter, {
            target: { value: UserRole.ENGINEERING_MANAGER },
        });
        expect(
            screen.getByText("No users match these filters.")
        ).toBeInTheDocument();

        fireEvent.change(roleFilter, { target: { value: "" } });

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

    it("adds multiple upcoming unavailability periods and removes a selected period", async () => {
        const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
        await renderUsers();

        fillCreateUser("ada", "Ada Lovelace");
        await screen.findByText("Ada Lovelace");
        await openUserDetails("Ada Lovelace");
        fireEvent.click(
            screen.getByRole("button", { name: "Manage Unavailability" })
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

        await waitFor(() => {
            expect(
                screen.queryByRole("heading", {
                    name: "Manage Unavailability",
                })
            ).not.toBeInTheDocument();
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Manage Unavailability" })
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

        await waitFor(() => {
            expect(
                screen.queryByRole("heading", {
                    name: "Manage Unavailability",
                })
            ).not.toBeInTheDocument();
        });

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

        await waitFor(() => {
            expect(
                screen.queryByRole("button", {
                    name: `Remove unavailability ${firstStart} to ${firstEnd}`,
                })
            ).not.toBeInTheDocument();
        });
        expect(
            screen.getByRole("button", {
                name: `Remove unavailability ${secondStart} to ${secondEnd}`,
            })
        ).toBeInTheDocument();
        expect(consoleLog).toHaveBeenLastCalledWith(
            "User unavailability periods:",
            [{
                id: 2,
                startDate: secondStart,
                endDate: secondEnd,
                reason: "",
                hours: null,
            }]
        );
        consoleLog.mockRestore();
    });
});
