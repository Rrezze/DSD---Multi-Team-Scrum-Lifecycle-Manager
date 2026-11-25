import { Link } from "react-router-dom";
import styles from "./pageNotFound.module.css";

export default function PageNotFound() {
    return (
        <section
            className={styles.pageNotFound}
            aria-labelledby="page-not-found-title"
        >
            <p className={styles.statusCode}>404</p>
            <h1 id="page-not-found-title">Page not found</h1>
            <p>The page you are looking for doesn&apos;t exist or may have moved.</p>
            <Link to="/productbacklog">Back to product backlog</Link>
        </section>
    );
}