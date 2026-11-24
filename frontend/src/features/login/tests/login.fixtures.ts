import type { LoginUser } from "../loginTypes";

export const loginUser = {
    id: 1,
    email: "ana@example.com",
    username: "ana",
    first_name: "Ana",
    last_name: "Dev",
    role: "DEVELOPER",
} satisfies LoginUser & { id: number; email: string };
