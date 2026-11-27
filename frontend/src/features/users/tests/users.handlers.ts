import { http, HttpResponse } from "msw";

import API_ENDPOINTS from "../../../constants/apiEndPoints";
import {
    UserRole,
    type ApiAbsence,
    type ApiUser,
    type CreateAbsencePayload,
    type CreateUserPayload,
} from "../usersTypes";
import { sampleAbsence, sampleUser } from "./users.fixtures";

export function createUsersHandlers() {
    let users: ApiUser[] = [];
    let nextUserId = 1;
    let nextAbsenceId = 1;
    const absencesByUser = new Map<number, ApiAbsence[]>([
        [sampleUser.id, [{ ...sampleAbsence }]],
    ]);

    return [
        http.get(API_ENDPOINTS.USERS, () => HttpResponse.json(users)),

        http.post(API_ENDPOINTS.USERS, async ({ request }) => {
            const payload = await request.json() as CreateUserPayload;
            const createdUser: ApiUser = {
                id: nextUserId++,
                ...payload,
                role: payload.role ?? UserRole.DEVELOPER,
                is_active: true,
            };
            users = [...users, createdUser];
            return HttpResponse.json(createdUser, { status: 201 });
        }),

        http.patch("/api/users/:userId/", async ({ params, request }) => {
            const userId = Number(params.userId);
            const payload = await request.json() as Partial<ApiUser>;
            const updatedUser = users.find((user) => user.id === userId);
            if (!updatedUser) {
                return HttpResponse.json({ detail: "User not found." }, { status: 404 });
            }
            Object.assign(updatedUser, payload);
            return HttpResponse.json(updatedUser);
        }),

        http.delete("/api/users/:userId/", ({ params }) => {
            const userId = Number(params.userId);
            users = users.filter((user) => user.id !== userId);
            return new HttpResponse(null, { status: 204 });
        }),

        http.get("/api/users/:userId/absences/", ({ params }) =>
            HttpResponse.json(absencesByUser.get(Number(params.userId)) ?? [])
        ),

        http.post("/api/users/:userId/absences/", async ({ params, request }) => {
            const userId = Number(params.userId);
            const payload = await request.json() as CreateAbsencePayload;
            const createdAbsence: ApiAbsence = {
                id: nextAbsenceId++,
                user: userId,
                ...payload,
                reason: payload.reason ?? "",
                hours: payload.hours ?? null,
            };
            const userAbsences = absencesByUser.get(userId) ?? [];
            absencesByUser.set(userId, [...userAbsences, createdAbsence]);
            return HttpResponse.json(createdAbsence, { status: 201 });
        }),

        http.patch("/api/absences/:absenceId/", async ({ params, request }) => {
            const absenceId = Number(params.absenceId);
            const payload = await request.json() as Partial<ApiAbsence>;
            for (const [userId, userAbsences] of absencesByUser) {
                const index = userAbsences.findIndex((absence) => absence.id === absenceId);
                if (index >= 0) {
                    const updatedAbsence = { ...userAbsences[index], ...payload };
                    userAbsences[index] = updatedAbsence;
                    absencesByUser.set(userId, userAbsences);
                    return HttpResponse.json(updatedAbsence);
                }
            }
            return HttpResponse.json({ detail: "Absence not found." }, { status: 404 });
        }),

        http.delete("/api/absences/:absenceId/", ({ params }) => {
            const absenceId = Number(params.absenceId);
            for (const [userId, userAbsences] of absencesByUser) {
                absencesByUser.set(
                    userId,
                    userAbsences.filter((absence) => absence.id !== absenceId)
                );
            }
            return new HttpResponse(null, { status: 204 });
        }),
    ];
}
