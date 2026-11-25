import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./authContext";
import Login from "./components/login/login";

export function LoginRoute() {
    const { user } = useAuth();
    return user ? <Navigate to="/productbacklog" replace /> : <Login />;
}

export function ProtectedRoute() {
    const { user } = useAuth();
    return user ? <Outlet /> : <Navigate to="/login" replace />;
}
