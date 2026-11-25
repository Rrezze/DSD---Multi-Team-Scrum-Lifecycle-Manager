import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { clearSessionUser, readSessionUser, saveSessionUser } from "./loginSession";
import type { LoginUser, SessionUser } from "./loginTypes";
import type { BacklogPermissions } from "./rolePermissions";

interface AuthState {
    user: SessionUser | null;
    permissions: BacklogPermissions;
    signIn: (user: LoginUser) => void;
    signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const guestPermissions = { canCreateTickets: false, canReorderTickets: false };

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState(readSessionUser);

    function signIn(identity: LoginUser) {
        setUser(saveSessionUser(identity));
    }

    function signOut() {
        clearSessionUser();
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, permissions: user?.permissions ?? guestPermissions, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const auth = useContext(AuthContext);
    if (!auth) throw new Error("useAuth requires an AuthProvider.");
    return auth;
}
