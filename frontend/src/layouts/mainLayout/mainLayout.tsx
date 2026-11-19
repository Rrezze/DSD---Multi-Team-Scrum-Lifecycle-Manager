
import { Outlet } from "react-router-dom";
import { Sidebar } from "../../components/sidebar/sidebar";
import styles from "./MainLayout.module.css";

export function MainLayout() {
    return (
        <div className={styles["app-layout"]}>
            <header className={styles["app-header"]}>
                <div className={styles["app-brand"]}>
                    <span className={styles["brand-icon"]}>Logo</span>
                    <span>ScrumFlow</span>
                </div>

                <div className={styles["app-title"]}>
                    Multi-Team Scrum Lifecycle Manager
                </div>

                <div className={styles["header-actions"]}>
                    <button type="button">?</button>
                </div>
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
