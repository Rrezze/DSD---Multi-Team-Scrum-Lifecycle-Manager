
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { http, HttpResponse } from "msw";

import { AuthProvider } from "../../authentication/authContext";
import { saveSessionUser } from "../../authentication/loginSession";
import { loginUser } from "../../authentication/tests/login.fixtures";
import ProductBacklog from "../productBacklog";
import { server } from "../../../tests/mocks/server";
import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { backlogTickets } from "./productBacklog.fixtures";

describe("ProductBacklog", () => {

    beforeEach(() => {
        saveSessionUser({ ...loginUser, role: "ENGINEERING_MANAGER" });
        server.resetHandlers();
        server.use(
        http.get(API_ENDPOINTS.TEAMS, () => {
            return HttpResponse.json([]);
        })
        );

    });

    /**
     * Helper: Opens the Create Ticket modal.
     */
    const openModal = () => {
        fireEvent.click(
            screen.getByRole("button", { name: "+ Create Ticket" })
        );
    };

    /**
     * Helper: Fills the ticket form with valid information.
     */
    const fillValidForm = () => {
        fireEvent.change(screen.getByLabelText(/Ticket title/i), {
            target: { value: "Implement login" },
        });

        fireEvent.change(screen.getByLabelText(/^Description$/i), {
            target: { value: "Implement user authentication" },
        });

        fireEvent.change(screen.getByLabelText(/Estimate points/i), {
            target: { value: "5" },
        });
    };

    describe("Page rendering", () => {

        it("should render the Product Backlog page", () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            expect(
                screen.getByRole("heading", {
                    name: "Product Backlog",
                })
            ).toBeInTheDocument();
        });

        it("should not display the modal initially", () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

    });

    describe("Backlog loading", () => {

        it("should show a loading message while tickets are being fetched", () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            expect(
                screen.getByText("Loading backlog tickets...")
            ).toBeInTheDocument();
        });

        it("should render fetched tickets in the backlog table", async () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            expect(
                await screen.findByText("Implement login")
            ).toBeInTheDocument();
            expect(
                screen.getByText("Set up CI pipeline")
            ).toBeInTheDocument();
            expect(screen.getByText("TODO")).toBeInTheDocument();
            expect(screen.getByText("IN PROGRESS")).toBeInTheDocument();
        });

        it("should display an empty state when the backlog has no tickets", async () => {
            server.use(
                http.get(API_ENDPOINTS.TICKETS, () => {
                    return HttpResponse.json([], { status: 200 });
                })
            );

            render(<ProductBacklog />, { wrapper: AuthProvider });

            expect(
                await screen.findByText(
                    "No tickets found in the product backlog."
                )
            ).toBeInTheDocument();
        });

        it("should allow retrying after a fetch failure", async () => {
            let requestCount = 0;

            server.use(
                http.get(API_ENDPOINTS.TICKETS, () => {
                    requestCount += 1;

                    if (requestCount === 2) {
                        return HttpResponse.json(
                            { detail: "Unable to load tickets." },
                            { status: 500 }
                        );
                    }

                    return HttpResponse.json(backlogTickets, {
                        status: 200,
                    });
                })
            );

            render(<ProductBacklog />, { wrapper: AuthProvider });

            expect(await screen.findByRole("alert")).toHaveTextContent(
                "Unable to load tickets.");

            fireEvent.click(screen.getByRole("button", { name: "Retry" }));

            expect(
                await screen.findByText("Implement login")
            ).toBeInTheDocument();
            expect(requestCount).toBe(3);
        });

        it("should align ticket and team fetch errors in the same section", async () => {
            server.use(
                http.get(API_ENDPOINTS.TICKETS, () =>
                    HttpResponse.json(
                        { detail: "Unable to load tickets." },
                        { status: 500 }
                    )
                ),
                http.get(API_ENDPOINTS.TEAMS, () =>
                    HttpResponse.json(
                        { detail: "Unable to load teams." },
                        { status: 500 }
                    )
                )
            );

            render(<ProductBacklog />, { wrapper: AuthProvider });

            await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
            const alerts = screen.getAllByRole("alert");

            expect(alerts[0]?.parentElement).toBe(alerts[1]?.parentElement);
            expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
        });

    });

    describe("Ticket details", () => {

        it("should open a selected ticket's details and close the dialog", async () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            fireEvent.click(await screen.findByText("Implement login"));

            const dialog = screen.getByRole("dialog");
            expect(dialog).toHaveTextContent("Ticket #1");
            expect(
                screen.getByRole("heading", {
                    name: "Ticket #1 · Implement login",
                })
            ).toBeInTheDocument();
            expect(dialog).toHaveTextContent(
                "Implement user authentication"
            );
            expect(dialog).toHaveTextContent("STORY");

            fireEvent.click(
                screen.getByRole("button", { name: "Close modal" })
            );

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

    });

    describe("Modal behaviour", () => {

        it("should open the modal when Create Ticket is clicked", () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();

            expect(screen.getByRole("dialog")).toBeInTheDocument();

            expect(
                screen.getByRole("heading", {
                    name: "Create new ticket",
                })
            ).toBeInTheDocument();
        });

        it("should close the modal when Cancel is clicked", () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();

            fireEvent.click(
                screen.getByRole("button", { name: "Cancel" })
            );

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("should reset the form when the modal is closed and reopened", () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();
            fillValidForm();

            fireEvent.click(
                screen.getByRole("button", { name: "Cancel" })
            );

            openModal();

            expect(
                screen.getByLabelText(/Ticket title/i)
            ).toHaveValue("");

            expect(
                screen.getByLabelText(/^Description$/i)
            ).toHaveValue("");

            expect(
                screen.getByLabelText(/Estimate points/i)
            ).toHaveValue(null);
        });

        it("should hide the parent field when Epic is selected", () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();

            fireEvent.change(
                screen.getByLabelText(/^Ticket type\s*\*/i),
                { target: { value: "EPIC" } }
            );

            expect(
                screen.queryByLabelText("Parent ticket")
            ).not.toBeInTheDocument();
        });

    });

    describe("Form validation", () => {

        it("should display validation errors when required fields are empty", () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();

            fireEvent.click(
                screen.getByRole("button", { name: "Create ticket" })
            );

            expect(
                screen.getByText("Ticket title is required.")
            ).toBeInTheDocument();
            expect(
                screen.getByText("Estimate points are required.")
            ).toBeInTheDocument();
        });

        it("should reject a non-positive or decimal estimate", () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();

            fireEvent.change(screen.getByLabelText(/Ticket title/i), {
                target: { value: "Implement login" },
            });

            fireEvent.change(screen.getByLabelText(/^Description$/i), {
                target: { value: "Implement authentication" },
            });

            fireEvent.change(screen.getByLabelText(/Estimate points/i), {
                target: { value: "2.5" },
            });

            fireEvent.click(
                screen.getByRole("button", { name: "Create ticket" })
            );

            expect(
                screen.getByText(
                    "Estimate must be a positive whole number."
                )
            ).toBeInTheDocument();
        });

    });

    describe("Ticket creation", () => {

        it("should send the correct ticket payload", async () => {
            let receivedPayload: unknown;

            server.use(
                http.post("/api/tickets/", async ({ request }) => {
                    receivedPayload = await request.json();

                    return HttpResponse.json(
                        { id: 1, title: "Implement login" },
                        { status: 201 }
                    );
                })
            );
            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();
            fillValidForm();

            fireEvent.click(
                screen.getByRole("button", { name: "Create ticket" })
            );

            await waitFor(() => {
                expect(receivedPayload).toEqual({
                    type: "STORY",
                    title: "Implement login",
                    description: "Implement user authentication",
                    estimate_points: 5,
                    parent: null,
                });
            });
        });

        it("should display a success notification after successful creation", async () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();
            fillValidForm();

            fireEvent.click(
                screen.getByRole("button", { name: "Create ticket" })
            );

            expect(
                await screen.findByText("Ticket created successfully!")
            ).toBeInTheDocument();

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("should reset the form after successful creation", async () => {
            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();
            fillValidForm();

            fireEvent.click(
                screen.getByRole("button", { name: "Create ticket" })
            );

            await screen.findByText("Ticket created successfully!");

            openModal();

            expect(
                screen.getByLabelText(/Ticket title/i)
            ).toHaveValue("");
        });

    });

    describe("API error handling", () => {

        it("should display an error notification when the API request fails", async () => {
            server.use(
                http.post("/api/tickets/", () => {
                    return HttpResponse.json(
                        { detail: "parent: An epic cannot have a parent." },
                        { status: 400 }
                    );
                })
            );

            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();
            fillValidForm();

            fireEvent.click(
                screen.getByRole("button", { name: "Create ticket" })
            );

            expect(
                await screen.findByRole("alert")
            ).toHaveTextContent(
                "parent: An epic cannot have a parent."
            );
        });

        it("should preserve form values when the API request fails", async () => {
            server.use(
                http.post("/api/tickets/", () => {
                    return HttpResponse.json(
                        { detail: "Server error" },
                        { status: 500 }
                    );
                })
            );

            render(<ProductBacklog />, { wrapper: AuthProvider });

            openModal();
            fillValidForm();

            fireEvent.click(
                screen.getByRole("button", { name: "Create ticket" })
            );

            await screen.findByText("Server error", { exact: true });

            expect(
                screen.getByLabelText(/Ticket title/i)
            ).toHaveValue("Implement login");

            expect(
                screen.getByLabelText(/^Description$/i)
            ).toHaveValue("Implement user authentication");

            expect(
                screen.getByLabelText(/Estimate points/i)
            ).toHaveValue(5);

            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

    });

});
