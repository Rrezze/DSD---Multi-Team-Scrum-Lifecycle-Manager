import { Outlet, useNavigate } from "react-router-dom";
import Button from "../../components/button/Button";
import { Sidebar } from "../../components/sidebar/sidebar";
import { useAuth } from "../../features/authentication/authContext";
import styles from "./mainLayout.module.css";

const roleNames = {
    PRODUCT_OWNER: "Product Owner",
    DEVELOPER: "Developer",
    ENGINEERING_MANAGER: "Engineering Manager",
};

export function MainLayout() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        signOut();
        navigate("/login", { replace: true });
    }

    return (
        <div className={styles["app-layout"]}>
            <header className={styles["app-header"]}>
                <span className={styles["app-title"]}>Multi-Team Scrum Lifecycle Manager</span>
                {user && <div className={styles.account}>
                    <span>{user.name} · {roleNames[user.role]}</span>
                    <Button type="button" variant="secondary" onClick={handleLogout}>Log out</Button>
                </div>}
            </header>
            <Sidebar />
            <div className={styles.workspace}>
                <main className={styles["page-content"]}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
