import { isUserRole } from "./loginTypes";
import type { LoginUser, SessionUser } from "./loginTypes";

import { getBacklogPermissions } from "./rolePermissions";

const SESSION_KEY = "scrumflow.user";

export function readSessionUser(): SessionUser | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const user = JSON.parse(raw);
        if (!user || typeof user.username !== "string" || !user.username.trim()
            || typeof user.name !== "string" || !user.name.trim() || !isUserRole(user.role)) {
            return null;
        }
        const permissions = getBacklogPermissions(user.role);
        const session = { username: user.username, name: user.name, role: user.role, permissions };
        if (user.permissions?.canCreateTickets !== permissions.canCreateTickets
            || user.permissions?.canReorderTickets !== permissions.canReorderTickets) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
        return session;
    } catch {
        return null;
    }
}

export function saveSessionUser(user: LoginUser) {
    const session: SessionUser = {
        username: user.username,
        name: [user.first_name, user.last_name].join(" ").trim() || user.username,
        role: user.role,
        permissions: getBacklogPermissions(user.role),
    };
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
        throw new Error("Unable to save your session. Allow browser storage and try again.");
    }
}

export function clearSessionUser() {
    sessionStorage.removeItem(SESSION_KEY);
}
