import {
    UserRole,
    type ApiAbsence,
    type ApiUser,
    type CreateAbsencePayload,
    type CreateUserPayload,
} from "../usersTypes";

export const sampleUser: ApiUser = {
    id: 4,
    username: "ada",
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    role: UserRole.DEVELOPER,
    is_active: true,
};

export const existingUser: ApiUser = {
    id: 12,
    username: "existing",
    email: "existing@example.com",
    first_name: "Existing",
    last_name: "User",
    role: UserRole.DEVELOPER,
    is_active: true,
};

export const sampleAna: ApiUser = {
    id: 21,
    username: "ana",
    email: "ana@example.com",
    first_name: "Ana",
    last_name: "Dev",
    role: UserRole.DEVELOPER,
    is_active: true,
};

export const existingUserAbsence: ApiAbsence = {
    id: 33,
    user: existingUser.id,
    start_date: "2026-12-01",
    end_date: "2026-12-02",
    reason: "Holiday",
    hours: null,
};

export const sampleAnaAbsences: ApiAbsence[] = [
    {
        id: 31,
        user: sampleAna.id,
        start_date: "2026-12-01",
        end_date: "2026-12-07",
        reason: "",
        hours: null,
    },
    {
        id: 32,
        user: sampleAna.id,
        start_date: "2026-12-10",
        end_date: "2026-12-16",
        reason: "",
        hours: null,
    },
];

export const sampleAbsence: ApiAbsence = {
    id: 8,
    user: sampleUser.id,
    start_date: "2026-12-01",
    end_date: "2026-12-03",
    reason: "Holiday",
    hours: null,
};

export const createUserPayload: CreateUserPayload = {
    username: sampleUser.username,
    email: sampleUser.email,
    first_name: sampleUser.first_name,
    last_name: sampleUser.last_name,
    role: sampleUser.role,
};

export const createAbsencePayload: CreateAbsencePayload = {
    start_date: "2026-12-10",
    end_date: "2026-12-11",
};
