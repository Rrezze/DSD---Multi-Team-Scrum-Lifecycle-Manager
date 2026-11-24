import { http, HttpResponse } from "msw";
import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { loginUser } from "./login.fixtures";

export const loginHandlers = [
    http.post(API_ENDPOINTS.LOGIN, async ({ request }) => {
        const body = await request.json();
        if (body && typeof body === "object" && "username" in body
            && body.username === loginUser.username) {
            return HttpResponse.json(loginUser);
        }
        if (body && typeof body === "object" && "username" in body && body.username === "") {
            return HttpResponse.json({ username: ["This field may not be blank."] }, { status: 400 });
        }
        return HttpResponse.json({ username: "User not found." }, { status: 400 });
    }),
];
