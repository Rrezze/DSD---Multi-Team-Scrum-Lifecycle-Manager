
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { http, HttpResponse } from "msw";

import ProductBacklog from "../productBacklog";
import { server } from "../../../tests/mocks/server";

describe("ProductBacklog", () => {

    beforeEach(() => {
        server.resetHandlers();
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

        fireEvent.change(screen.getByLabelText(/Description/i), {
            target: { value: "Implement user authentication" },
        });

        fireEvent.change(screen.getByLabelText(/Estimate points/i), {
            target: { value: "5" },
        });
    };

    describe("Page rendering", () => {

        it("should render the Product Backlog page", () => {
            render(<ProductBacklog />);

            expect(
                screen.getByRole("heading", {
                    name: "Product Backlog",
                })
            ).toBeInTheDocument();
        });

        it("should not display the modal initially", () => {
            render(<ProductBacklog />);

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

    });

    describe("Modal behaviour", () => {

        it("should open the modal when Create Ticket is clicked", () => {
            render(<ProductBacklog />);

            openModal();

            expect(screen.getByRole("dialog")).toBeInTheDocument();

            expect(
                screen.getByRole("heading", {
                    name: "Create new ticket",
                })
            ).toBeInTheDocument();
        });

        it("should close the modal when Cancel is clicked", () => {
            render(<ProductBacklog />);

            openModal();

            fireEvent.click(
                screen.getByRole("button", { name: "Cancel" })
            );

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("should reset the form when the modal is closed and reopened", () => {
            render(<ProductBacklog />);

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
                screen.getByLabelText(/Description/i)
            ).toHaveValue("");

            expect(
                screen.getByLabelText(/Estimate points/i)
            ).toHaveValue(null);
        });

        it("should hide the parent field when Epic is selected", () => {
            render(<ProductBacklog />);

            openModal();

            fireEvent.change(
                screen.getByLabelText(/Ticket type/i),
                { target: { value: "EPIC" } }
            );

            expect(
                screen.queryByLabelText("Parent ticket")
            ).not.toBeInTheDocument();
        });

    });

    describe("Form validation", () => {

        it("should display validation errors when required fields are empty", () => {
            render(<ProductBacklog />);

            openModal();

            fireEvent.click(
                screen.getByRole("button", { name: "Create ticket" })
            );

            expect(
                screen.getByText("Ticket title is required.")
            ).toBeInTheDocument();

            expect(
                screen.queryByText("Description is required.")
            ).not.toBeInTheDocument();

            expect(
                screen.getByText("Estimate points are required.")
            ).toBeInTheDocument();
        });

        it("should reject a non-positive or decimal estimate", () => {
            render(<ProductBacklog />);

            openModal();

            fireEvent.change(screen.getByLabelText(/Ticket title/i), {
                target: { value: "Implement login" },
            });

            fireEvent.change(screen.getByLabelText(/Description/i), {
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

            render(<ProductBacklog />);

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
            render(<ProductBacklog />);

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
            render(<ProductBacklog />);

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

            render(<ProductBacklog />);

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

            render(<ProductBacklog />);

            openModal();
            fillValidForm();

            fireEvent.click(
                screen.getByRole("button", { name: "Create ticket" })
            );

            await screen.findByRole("alert");

            expect(
                screen.getByLabelText(/Ticket title/i)
            ).toHaveValue("Implement login");

            expect(
                screen.getByLabelText(/Description/i)
            ).toHaveValue("Implement user authentication");

            expect(
                screen.getByLabelText(/Estimate points/i)
            ).toHaveValue(5);

            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

    });

});
