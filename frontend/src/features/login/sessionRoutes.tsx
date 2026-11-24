import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/button/Button";
import ProductBacklog from "../productBacklog/productBacklog";
import Login from "./login";
import { clearSessionUser, readSessionUser } from "./loginSession";
import styles from "./login.module.css";

const roleNames = {
    PRODUCT_OWNER: "Product Owner",
    DEVELOPER: "Developer",
    ENGINEERING_MANAGER: "Engineering Manager",
};

export function LoginRoute() {
    return readSessionUser() ? <Navigate to="/productbacklog" replace /> : <Login />;
}

export function BacklogRoute() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = readSessionUser();
    if (!user) return <Navigate to="/login" replace />;

    function handleLogout() {
        clearSessionUser();
        navigate("/login", { replace: true });
    }

    return (
        <>
            <header className={styles.sessionBar} aria-label="Account">
                <span>{user.name} · {roleNames[user.role]}</span>
                <Button type="button" variant="secondary" onClick={handleLogout}>Log out</Button>
            </header>
            <ProductBacklog permissions={user.permissions} focusHeading={location.state?.fromLogin === true} />
        </>
    );
}
