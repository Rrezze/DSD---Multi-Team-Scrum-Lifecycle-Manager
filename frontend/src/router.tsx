
import { createBrowserRouter } from "react-router-dom";
import ProductBacklog from "./features/productBacklog/productBacklog";
import { MainLayout } from "./layouts/mainLayout/mainLayout";
import Teams from "./features/teams/teams";
import Users from "./features/users/users";
import SprintPlanning from "./features/sprintPlanning/sprintPlanning";
import PageNotFound from "./components/pageNotFound/pagenotFound";

export const routes = [

    {
        path: "/", element: <MainLayout />,
        children: [
            { index: true, element: <ProductBacklog /> },
            { path: "/productbacklog", element: <ProductBacklog /> },
            { path: "/users", element: <Users /> },
            { path: "/sprints", element: <SprintPlanning /> },
            { path: "/teams", element: <Teams /> },
            { path: "*", element: <PageNotFound /> },
        ]
    },
];

export const router = createBrowserRouter(routes);
