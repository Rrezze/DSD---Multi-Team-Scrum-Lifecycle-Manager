
import { NavLink } from "react-router-dom";
import styles from "./sidebar.module.css";

const navigationItems = [
  
    { label: "Product Backlog", path: "/productbacklog", icon: "☷" },
    { label: "Sprint Planning", path: "/sprints", icon: "▣" },
    { label: "Team Boards", path: "/boards", icon: "◫" },
    { label: "Teams", path: "/teams", icon: "♧" },
    { label: "Users", path: "/users", icon: "♧" },
    { label: "Cross-Team Overview", path: "/overview", icon: "◇" }
];

export function Sidebar() {
    return (
        <aside className={styles.sidebar}>
            <div className={styles["sidebar-brand"]}>
                <div className={styles["sidebar-logo"]}>▥</div>
                <div>
                    <strong>ScrumFlow</strong>
                    <span>Lifecycle Manager</span>
                </div>
            </div>

            <div className={styles["sidebar-navigation"]}>
                <span className={styles["sidebar-section-title"]}>WORKSPACE</span>

                <nav>
                    {navigationItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/"}
                            className={({ isActive }) =>
                                `${styles["sidebar-link"]} ${isActive ? styles.active : ""}`
                            }
                        >
                            <span className={styles["sidebar-link-icon"]}>{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className={styles["sidebar-footer"]}>
                
                    <div>                        
                        <span>Logout</span>
                    </div>
                
                <div className={styles["workspace-info"]}>
                    <div className={styles["workspace-avatar"]}>PO</div>
                    <div>
                        <strong>Product Owner</strong>
                        <span>Enterprise workspace</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
