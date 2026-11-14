import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import Notification from "./notification";

describe("Notification", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("automatically disappears after 15 seconds", () => {
        vi.useFakeTimers();

        render(
            <Notification
                type="success"
                message="Ticket created successfully!"
            />
        );

        expect(screen.getByRole("status")).toHaveTextContent(
            "Ticket created successfully!"
        );

        act(() => {
            vi.advanceTimersByTime(14_999);
        });

        expect(screen.getByRole("status")).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("can be dismissed with the close button", () => {
        render(
            <Notification
                type="success"
                message="Ticket created successfully!"
            />
        );

        fireEvent.click(
            screen.getByRole("button", { name: "Close notification" })
        );

        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
});
