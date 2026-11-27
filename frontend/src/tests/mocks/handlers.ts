import { productBacklogHandlers } from
    "../../features/productBacklog/tests/productBacklog.handlers";
import { createUsersHandlers } from
    "../../features/users/tests/users.handlers";

export const handlers = [
    ...productBacklogHandlers,
    ...createUsersHandlers(),
];