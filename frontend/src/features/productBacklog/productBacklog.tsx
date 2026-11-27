
/**
 * Product Backlog Page
 *
 * Responsible for displaying the Product Backlog page
 * and managing ticket-related actions.
 *
 * Architecture:
 * - Shared Button provides reusable button styling.
 * - Shared Notification displays success and error messages.
 * - productBacklogApi handles backend communication.
 * - productBacklogTypes provides feature-specific TypeScript types.
 *
 * Search and filter controls are arranged in a single toolbar.
 * Ticket forms and their validation remain within their own components.
 */

import { useCallback, useEffect, useState } from "react";

import styles from "./productBacklog.module.css";

import Button from "../../components/button/Button";
import Notification from "../../components/notification/notification";

import CreateTicket from "./components/createTicket/createTicket";
import EditTicket from "./components/editTicket/editTicket";
import ViewTicket from "./components/viewTicket/viewTicket";
import ProductBacklogTable from "./components/productBacklogTable/productBacklogTable";

import { getBacklogTickets } from "./productBacklogApi";
import { getTeams } from "../teams/teamsApi";
import type { BacklogTicket } from "./productBacklogTypes";
import type { ApiTeam } from "../teams/teamsTypes";

export default function ProductBacklog() {
    const [tickets, setTickets] = useState<BacklogTicket[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [teams, setTeams] = useState<ApiTeam[]>([]);
    const [selectedTeam, setSelectedTeam] = useState("");
    const [isLoadingTeams, setIsLoadingTeams] = useState(true);
    const [teamFetchError, setTeamFetchError] = useState("");
    const [isLoadingTickets, setIsLoadingTickets] = useState(true);
    const [ticketFetchError, setTicketFetchError] = useState("");
    const [allTickets, setAllTickets] = useState<BacklogTicket[]>([]);
    const [selectedTicket, setSelectedTicket] =
        useState<BacklogTicket | null>(null);

    const [ticketToEdit, setTicketToEdit] =
        useState<BacklogTicket | null>(null);

    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] =
        useState(false);

    const [successMessage, setSuccessMessage] = useState("");

    // Fetch tickets using the currently selected search and filter values.
    const fetchTickets = useCallback(async () => {
        try {
            setIsLoadingTickets(true);
            setTicketFetchError("");

            const data = await getBacklogTickets({
                search: searchTerm,
                type: selectedType,
                status: selectedStatus,
                team: selectedTeam,

            });

            setTickets(data);
        } catch (error) {
            setTicketFetchError(
                error instanceof Error
                    ? error.message
                    : "Failed to load backlog tickets."
            );
        } finally {
            setIsLoadingTickets(false);
        }
    }, [searchTerm, selectedType, selectedStatus, selectedTeam]);

    // Fetch all tickets for looking up parent ticket titles.
    const fetchAllTickets = useCallback(async () => {
        try {
            const data = await getBacklogTickets();
            setAllTickets(data);
        } catch (error) {
            console.error("Failed to load parent ticket information:", error);
        }
    }, []);

    useEffect(() => {
    void fetchAllTickets();
}, [fetchAllTickets]);

    // Reload tickets whenever the search or filter values change.
    useEffect(() => {
        void fetchTickets();
    }, [fetchTickets]);

    // Open Create Ticket modal.
    const handleCreateTicketModalOpen = () => {
        setSuccessMessage("");
        setIsCreateTicketModalOpen(true);
    };

    // Handle successful ticket creation.
    const handleTicketCreated = () => {
        setIsCreateTicketModalOpen(false);
        setSuccessMessage("Ticket created successfully!");
        void fetchTickets();
        void fetchAllTickets();

    };

    // Open ticket details.
    const handleTicketClick = (ticket: BacklogTicket) => {
        setSelectedTicket(ticket);
    };

    // Open Edit Ticket modal.
    const handleEditTicket = (ticket: BacklogTicket) => {
        setTicketToEdit(ticket);
        setSelectedTicket(null);
        setSuccessMessage("");
    };

    // Handle successful ticket update.
    const handleTicketUpdated = () => {
        setSuccessMessage("Ticket updated successfully!");
        void fetchTickets();
        void fetchAllTickets();
    };

    // Fetch available teams for the Teams filter.
    useEffect(() => {
        let isMounted = true;

        const fetchTeams = async () => {
            try {
                setIsLoadingTeams(true);
                setTeamFetchError("");

                const data = await getTeams();

                if (isMounted) {
                    setTeams(data);
                }
            } catch (error) {
                if (isMounted) {
                    setTeamFetchError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load teams."
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoadingTeams(false);
                }
            }
        };

        void fetchTeams();

        return () => {
            isMounted = false;
        };
    }, []);
    return (
        <main className={styles.page}>
            {/* Page Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        Product Backlog
                    </h1>

                    <p className={styles.description}>
                        Manage and organize your product backlog tickets.
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={handleCreateTicketModalOpen}
                >
                    + Create Ticket
                </Button>
            </div>

            {/* Success Notification */}
            <Notification
                type="success"
                message={successMessage}
            />

            {/* Search and Filter Toolbar */}
            <div className={styles.toolbarContainer}>

                {/* Search Tickets */}
                <div className={styles.searchContainer}>
                    <span
                        className={styles.searchIcon}
                        aria-hidden="true"
                    >
                        🔍
                    </span>

                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search tickets by title or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search tickets by title or description"
                    />

                    {searchTerm && (
                        <button
                            type="button"
                            className={styles.clearSearchButton}
                            onClick={() => setSearchTerm("")}
                            aria-label="Clear search"
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* Ticket Filters */}
                <div className={styles.filterContainer}>

                    {/* Filter by Ticket Type */}
                    <div className={styles.filterGroup}>
                        <label htmlFor="ticket-type-filter">
                            Ticket Type
                        </label>

                        <select
                            id="ticket-type-filter"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="EPIC">Epic</option>
                            <option value="STORY">Story</option>
                            <option value="TASK">Task</option>
                            <option value="BUG">Bug</option>
                        </select>
                    </div>

                    {/* Filter by Ticket Status */}
                    <div className={styles.filterGroup}>
                        <label htmlFor="ticket-status-filter">
                            Status
                        </label>

                        <select
                            id="ticket-status-filter"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="WAITING_FOR_QA">Waiting for QA</option>
                            <option value="IN_QA">In QA</option>
                            <option value="DONE">Done</option>
                        </select>
                    </div>
                    {/* Filter by Team */}
                    <div className={styles.filterGroup}>
                        <label htmlFor="ticket-team-filter">
                            Team
                        </label>
                        <select
                            id="ticket-team-filter"
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            disabled={isLoadingTeams || Boolean(teamFetchError)}
                        >
                            <option value="">All Teams</option>
                            <option value="none">Unassigned</option>

                            {teams.map((team) => (
                                <option key={team.id} value={String(team.id)}>
                                    {team.name}
                                </option>
                            ))}
                        </select>

                    </div>
                </div>
            </div>

            {(teamFetchError || ticketFetchError) && (
                <div className={styles.errorMessages}>
                    {teamFetchError && (
                        <div className={styles.fetchError} role="alert">
                            <p>{teamFetchError}</p>
                        </div>
                    )}

                    {ticketFetchError && (
                        <div className={styles.fetchError} role="alert">
                            <p>{ticketFetchError}</p>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void fetchTickets()}
                            >
                                Retry
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Product Backlog Table */}
            {isLoadingTickets ? (
                <p>Loading backlog tickets...</p>
            ) : !ticketFetchError ? (
                <ProductBacklogTable
                    tickets={tickets}
                    parentTickets={allTickets}
                    teams={teams}
                    onTicketClick={handleTicketClick}
                />
            ) : null}

            {/* Create Ticket */}
            <CreateTicket
                isOpen={isCreateTicketModalOpen}
                onClose={() => setIsCreateTicketModalOpen(false)}
                onSuccess={handleTicketCreated}
                tickets={allTickets}
            />

            {/* View Ticket */}
            <ViewTicket
                ticket={selectedTicket}
                onClose={() => setSelectedTicket(null)}
                onEdit={handleEditTicket}
            />

            {/* Edit Ticket */}
            <EditTicket
                ticket={ticketToEdit}
                tickets={allTickets}
                onClose={() => setTicketToEdit(null)}
                onSuccess={handleTicketUpdated}
            />
        </main>
    );
}
