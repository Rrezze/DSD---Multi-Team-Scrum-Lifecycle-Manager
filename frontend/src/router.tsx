
import { createBrowserRouter } from "react-router-dom";
import ProductBacklog from "./features/productBacklog/productBacklog";
import { MainLayout } from "./layouts/mainLayout/mainLayout";
import Teams from "./features/teams/teams";
import Users from "./features/users/users";
export const router = createBrowserRouter([

    {
        path: "/", element: <MainLayout />,
        children: [
            { path: "/productbacklog", element: <ProductBacklog /> },
            { path: "/users", element: <Users /> },
            { path: "/teams", element: <Teams /> },

        ]
    },
   
],

);
