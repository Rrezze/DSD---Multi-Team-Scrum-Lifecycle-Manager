
import { createBrowserRouter } from "react-router-dom";


import ProductBacklog from "./features/productBacklog/productBacklog";
export const router = createBrowserRouter([

    { path: "/", element: <ProductBacklog /> },
    { path: "/productbacklog", element: <ProductBacklog /> },
],

);
