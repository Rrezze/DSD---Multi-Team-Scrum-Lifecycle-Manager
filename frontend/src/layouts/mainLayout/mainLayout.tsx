
import { Outlet } from "react-router-dom";
import { Sidebar } from "../../components/sidebar/sidebar";
import styles from "./mainLayout.module.css";

export function MainLayout() {
    return (
        <div className={styles["app-layout"]}>
            {/* Main navigation sidebar */}
            <Sidebar />

            {/* Main page content */}
            <div className={styles.workspace}>
                <main className={styles["page-content"]}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
