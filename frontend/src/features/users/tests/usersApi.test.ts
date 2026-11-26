import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { server } from "../../../tests/mocks/server";
import {
    createUser,
    createUserAbsence,
    deleteUser,
    deleteUserAbsence,
    getUserAbsences,
    getUsers,
    updateUserAbsence,
    updateUser,
} from "../usersApi";
import {
    UserRole,
    type ApiAbsence,
    type CreateAbsencePayload,
    type CreateUserPayload,
} from "../usersTypes";

const user = {
    id: 4,
    username: "ada",
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    role: UserRole.DEVELOPER,
    is_active: true,
};

const createPayload: CreateUserPayload = {
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
};

const absence: ApiAbsence = {
    id: 8,
    user: user.id,
    start_date: "2026-12-01",
    end_date: "2026-12-03",
    reason: "Holiday",
    hours: null,
};

const createAbsencePayload: CreateAbsencePayload = {
    start_date: "2026-12-10",
    end_date: "2026-12-11",
};

describe("usersApi", () => {
    beforeEach(() => {
        server.resetHandlers();
    });

    it("fetches users with the supported role and search filters", async () => {
        let receivedUrl: URL | undefined;
        server.use(
            http.get(API_ENDPOINTS.USERS, ({ request }) => {
                receivedUrl = new URL(request.url);
                return HttpResponse.json([user]);
            })
        );

        await expect(
            getUsers({ role: UserRole.DEVELOPER, search: " ada " })
        ).resolves.toEqual([user]);
        expect(receivedUrl?.searchParams.get("role")).toBe("DEVELOPER");
        expect(receivedUrl?.searchParams.get("search")).toBe("ada");
    });

    it("posts the API payload and returns the created user", async () => {
        let receivedPayload: unknown;
        server.use(
            http.post(API_ENDPOINTS.USERS, async ({ request }) => {
                receivedPayload = await request.json();
                return HttpResponse.json(user, { status: 201 });
            })
        );

        await expect(createUser(createPayload)).resolves.toEqual(user);
        expect(receivedPayload).toEqual(createPayload);
    });

    it("allows user creation without a role so the backend default applies", async () => {
        let receivedPayload: unknown;
        server.use(
            http.post(API_ENDPOINTS.USERS, async ({ request }) => {
                receivedPayload = await request.json();
                return HttpResponse.json(user, { status: 201 });
            })
        );

        await expect(createUser({
            username: "ada",
            email: "ada@example.com",
            first_name: "Ada",
            last_name: "Lovelace",
        })).resolves.toEqual(user);
        expect(receivedPayload).toEqual({
            username: "ada",
            email: "ada@example.com",
            first_name: "Ada",
            last_name: "Lovelace",
        });
    });

    it("patches user first name, last name, and email", async () => {
        let receivedMethod = "";
        let receivedPayload: unknown;
        server.use(
            http.patch(API_ENDPOINTS.USER_DETAIL(user.id), async ({ request }) => {
                receivedMethod = request.method;
                receivedPayload = await request.json();
                return HttpResponse.json({
                    ...user,
                    first_name: "Ada Augusta",
                    email: "ada.augusta@example.com",
                });
            })
        );

        await expect(updateUser(user.id, {
            first_name: "Ada Augusta",
            last_name: "Lovelace",
            email: "ada.augusta@example.com",
        })).resolves.toEqual({
            ...user,
            first_name: "Ada Augusta",
            email: "ada.augusta@example.com",
        });
        expect(receivedMethod).toBe("PATCH");
        expect(receivedPayload).toEqual({
            first_name: "Ada Augusta",
            last_name: "Lovelace",
            email: "ada.augusta@example.com",
        });
    });

    it("throws the backend validation message when creation fails", async () => {
        server.use(
            http.post(API_ENDPOINTS.USERS, () =>
                HttpResponse.json(
                    { username: ["This username is already taken."] },
                    { status: 400 }
                )
            )
        );

        await expect(createUser(createPayload)).rejects.toThrow(
            "This username is already taken."
        );
    });

    it("deactivates a user through the user detail endpoint", async () => {
        let receivedMethod = "";
        server.use(
            http.delete(API_ENDPOINTS.USER_DETAIL(user.id), ({ request }) => {
                receivedMethod = request.method;
                return new HttpResponse(null, { status: 204 });
            })
        );

        await expect(deleteUser(user.id)).resolves.toBeUndefined();
        expect(receivedMethod).toBe("DELETE");
    });

    it("fetches a user's absences from the per-user endpoint", async () => {
        let receivedMethod = "";
        server.use(
            http.get(API_ENDPOINTS.USER_ABSENCES(user.id), ({ request }) => {
                receivedMethod = request.method;
                return HttpResponse.json([absence]);
            })
        );

        await expect(getUserAbsences(user.id)).resolves.toEqual([absence]);
        expect(receivedMethod).toBe("GET");
    });

    it("posts the absence dates to the per-user endpoint", async () => {
        let receivedPayload: unknown;
        server.use(
            http.post(
                API_ENDPOINTS.USER_ABSENCES(user.id),
                async ({ request }) => {
                    receivedPayload = await request.json();
                    return HttpResponse.json(
                        { ...absence, ...createAbsencePayload },
                        { status: 201 }
                    );
                }
            )
        );

        await expect(
            createUserAbsence(user.id, createAbsencePayload)
        ).resolves.toEqual({ ...absence, ...createAbsencePayload });
        expect(receivedPayload).toEqual(createAbsencePayload);
    });

    it("deletes an absence through the absence detail endpoint", async () => {
        let receivedMethod = "";
        server.use(
            http.delete(API_ENDPOINTS.ABSENCE_DETAIL(absence.id), ({ request }) => {
                receivedMethod = request.method;
                return new HttpResponse(null, { status: 204 });
            })
        );

        await expect(deleteUserAbsence(absence.id)).resolves.toBeUndefined();
        expect(receivedMethod).toBe("DELETE");
    });

    it("patches an existing absence through the absence detail endpoint", async () => {
        let receivedMethod = "";
        let receivedPayload: unknown;
        server.use(
            http.patch(
                API_ENDPOINTS.ABSENCE_DETAIL(absence.id),
                async ({ request }) => {
                    receivedMethod = request.method;
                    receivedPayload = await request.json();
                    return HttpResponse.json({
                        ...absence,
                        ...createAbsencePayload,
                    });
                }
            )
        );

        await expect(
            updateUserAbsence(absence.id, createAbsencePayload)
        ).resolves.toEqual({
            ...absence,
            ...createAbsencePayload,
        });
        expect(receivedMethod).toBe("PATCH");
        expect(receivedPayload).toEqual(createAbsencePayload);
    });

    it("surfaces an update error without deleting or recreating the absence", async () => {
        const requestMethods: string[] = [];
        server.use(
            http.patch(API_ENDPOINTS.ABSENCE_DETAIL(absence.id), () => {
                requestMethods.push("PATCH");
                return HttpResponse.json(
                    { detail: "The replacement overlaps another absence." },
                    { status: 400 }
                );
            }),
            http.delete(API_ENDPOINTS.ABSENCE_DETAIL(absence.id), () => {
                requestMethods.push("DELETE");
                return new HttpResponse(null, { status: 204 });
            }),
            http.post(API_ENDPOINTS.USER_ABSENCES(user.id), () => {
                requestMethods.push("POST");
                return HttpResponse.json(absence, { status: 201 });
            })
        );

        await expect(
            updateUserAbsence(absence.id, createAbsencePayload)
        ).rejects.toThrow("The replacement overlaps another absence.");
        expect(requestMethods).toEqual(["PATCH"]);
    });
});
