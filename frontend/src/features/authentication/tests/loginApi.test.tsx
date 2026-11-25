import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { server } from "../../../tests/mocks/server";
import { login } from "../loginApi";
import { loginUser } from "./login.fixtures";

describe("login API", () => {
    it("posts only the trimmed username and returns the database user", async () => {
        let body: unknown;
        server.use(http.post(API_ENDPOINTS.LOGIN, async ({ request }) => {
            body = await request.json();
            return HttpResponse.json(loginUser);
        }));
        await expect(login(" ana ")).resolves.toEqual(loginUser);
        expect(body).toEqual({ username: "ana" });
    });

    it("preserves the backend username error", async () => {
        await expect(login("unknown")).rejects.toThrow("User not found.");
    });

    it("normalizes serializer validation arrays", async () => {
        await expect(login(" ")).rejects.toThrow(/^This field may not be blank\.$/);
    });

    it("rejects an incomplete success response", async () => {
        server.use(http.post(API_ENDPOINTS.LOGIN, () => HttpResponse.json({ username: "ana" })));
        await expect(login("ana")).rejects.toThrow("Invalid login response");
    });

    it("uses the shared network error message", async () => {
        server.use(http.post(API_ENDPOINTS.LOGIN, () => HttpResponse.error()));
        await expect(login("ana")).rejects.toThrow("Unable to connect");
    });
});
