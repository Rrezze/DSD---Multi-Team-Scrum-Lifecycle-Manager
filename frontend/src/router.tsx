import { createBrowserRouter } from "react-router-dom";
import { BacklogRoute, LoginRoute } from "./features/login/sessionRoutes";

export const router = createBrowserRouter([
    { path: "/", element: <LoginRoute /> },
    { path: "/login", element: <LoginRoute /> },
    { path: "/productbacklog", element: <BacklogRoute /> },
]);
