import { productBacklogHandlers } from
    "../../features/productBacklog/tests/productBacklog.handlers";

import { loginHandlers } from "../../features/authentication/tests/login.handlers";

export const handlers = [
    ...loginHandlers,
    ...productBacklogHandlers,
];