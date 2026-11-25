import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import PageNotFound from "./components/pageNotFound/pagenotFound";
import { AuthProvider } from "./features/authentication/authContext";
import { LoginRoute, ProtectedRoute } from "./features/authentication/sessionRoutes";
import ProductBacklog from "./features/productBacklog/productBacklog";
import Teams from "./features/teams/teams";
import Users from "./features/users/users";
import { MainLayout } from "./layouts/mainLayout/mainLayout";

function BacklogPage() {
    const location = useLocation();
    return <ProductBacklog focusHeading={location.state?.fromLogin === true} />;
}

export const routes = [{
    path: "/",
    element: <AuthProvider><MainLayout /></AuthProvider>,
    children: [
        { path: "login", element: <LoginRoute /> },
        {
            element: <ProtectedRoute />,
            children: [
                { index: true, element: <Navigate to="/productbacklog" replace /> },
                { path: "productbacklog", element: <BacklogPage /> },
                { path: "users", element: <Users /> },
                { path: "teams", element: <Teams /> },
                { path: "*", element: <PageNotFound /> },
            ],
        },
    ],
}];

export const router = createBrowserRouter(routes);
