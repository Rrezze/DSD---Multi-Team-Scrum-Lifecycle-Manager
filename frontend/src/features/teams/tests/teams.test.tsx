
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";

import "@testing-library/jest-dom/vitest";

import { http, HttpResponse } from "msw";

import API_ENDPOINTS from "../../../constants/apiEndPoints";
import { server } from "../../../tests/mocks/server";

import { UserRole } from "../../users/usersTypes";
import Teams from "../teams";

import type { ApiTeam } from "../teamsTypes";
import type {
    ApiMembership,
    ApiTeamCapacity,
} from "../teamsApi";

/* -------------------------------------------------------------------------- */
/* Test data generation                                                       */
/* -------------------------------------------------------------------------- */

// Generate unique IDs so tests do not depend on fixed database records.
const createTestId = () =>
    Math.floor(Math.random() * 1_000_000) + 1;

// Generate a unique name for each test team.
const createTestTeam = (id: number): ApiTeam => ({
    id,
    name: `Test Team ${crypto.randomUUID()}`,
    description: `Description ${crypto.randomUUID()}`,
    is_active: true,
});

// Generate a developer with unique identifying information.
const createTestUser = (id: number) => ({
    id,
    username: `developer-${crypto.randomUUID()}`,
    email: `${crypto.randomUUID()}@example.test`,
    first_name: "Developer",
    last_name: crypto.randomUUID(),
    role: UserRole.DEVELOPER,
    is_active: true,
});

// Generate all initial test records.
const teamOne = createTestTeam(createTestId());
const teamTwo = createTestTeam(createTestId());

const developerOne = createTestUser(createTestId());
const developerTwo = createTestUser(createTestId());

const inactiveDeveloper = {
    ...createTestUser(createTestId()),
    is_active: false,
};

const developerName = (user: typeof developerOne) =>
    `${user.first_name} ${user.last_name}`;

const initialTeams: ApiTeam[] = [teamOne, teamTwo];

const users = [
    developerOne,
    developerTwo,
    inactiveDeveloper,
];

const initialCapacityPoints = createTestId() % 50 + 1;

const initialMemberships: ApiMembership[] = [
    {
        id: createTestId(),
        user: developerOne.id,
        team: teamOne.id,
        sprint: createTestId(),
        role: "DEVELOPER",
        available_hours: 80,
        absent_hours: 0,
        capacity_points: initialCapacityPoints,
    },
];

const initialCapacities: ApiTeamCapacity[] = [
    {
        team: teamOne.id,
        team_name: teamOne.name,
        capacity_points: initialCapacityPoints,
        members: [
            {
                membership: initialMemberships[0].id,
                user: developerOne.id,
                capacity_points: initialCapacityPoints,
            },
        ],
    },
    {
        team: teamTwo.id,
        team_name: teamTwo.name,
        capacity_points: 0,
        members: [],
    },
];

/* -------------------------------------------------------------------------- */
/* In-memory backend state for UI tests                                       */
/* -------------------------------------------------------------------------- */

let teams: ApiTeam[] = [];
let memberships: ApiMembership[] = [];
let capacities: ApiTeamCapacity[] = [];

let nextTeamId = 0;
let nextMembershipId = 0;

const defaultCapacityPoints = createTestId() % 50 + 1;

/**
 * Recalculates team capacities after membership changes.
 * This simulates the capacity information returned by the backend.
 */
function refreshCapacities() {
    capacities = teams.map((team) => {
        const teamMemberships = memberships.filter(
            (membership) => membership.team === team.id
        );

        return {
            team: team.id,
            team_name: team.name,
            capacity_points: teamMemberships.reduce(
                (total, membership) =>
                    total + membership.capacity_points,
                0
            ),
            members: teamMemberships.map((membership) => ({
                membership: membership.id,
                user: membership.user,
                capacity_points: membership.capacity_points,
            })),
        };
    });
}

/* -------------------------------------------------------------------------- */
/* MSW API handlers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Registers test-only API handlers.
 *
 * The handlers simulate backend responses and update the in-memory state
 * after create, update and delete requests.
 */
function registerTeamsApiHandlers() {
    server.use(
        // Return active teams.
        http.get(API_ENDPOINTS.TEAMS, () => {
            return HttpResponse.json(
                teams.filter((team) => team.is_active)
            );
        }),

        // Return developers.
        http.get(API_ENDPOINTS.USERS, () => {
            return HttpResponse.json(users);
        }),

        // Return memberships.
        // The API tests separately verify the sprint and user filters.
        http.get("/api/memberships/", ({ request }) => {
            const url = new URL(request.url);
            const user = url.searchParams.get("user");

            let result = [...memberships];

            if (user) {
                result = result.filter(
                    (membership) =>
                        membership.user === Number(user)
                );
            }

            return HttpResponse.json(result);
        }),

        // Return calculated team capacities.
        http.get(`${API_ENDPOINTS.TEAMS}capacity/`, () => {
            return HttpResponse.json(capacities);
        }),

        // Create a team.
        http.post(API_ENDPOINTS.TEAMS, async ({ request }) => {
            const payload = await request.json() as {
                name: string;
                description?: string;
            };

            const createdTeam: ApiTeam = {
                id: nextTeamId++,
                name: payload.name,
                description: payload.description ?? "",
                is_active: true,
            };

            teams.push(createdTeam);
            refreshCapacities();

            return HttpResponse.json(createdTeam, {
                status: 201,
            });
        }),

        // Update a team.
        http.patch(
            `${API_ENDPOINTS.TEAMS}:teamId/`,
            async ({ params, request }) => {
                const teamId = Number(params.teamId);

                const payload = await request.json() as Partial<ApiTeam>;

                const existingTeam = teams.find(
                    (team) => team.id === teamId
                );

                if (!existingTeam) {
                    return HttpResponse.json(
                        { detail: "Team not found." },
                        { status: 404 }
                    );
                }

                Object.assign(existingTeam, payload);
                refreshCapacities();

                return HttpResponse.json(existingTeam);
            }
        ),

        // Deactivate a team.
        http.delete(
            `${API_ENDPOINTS.TEAMS}:teamId/`,
            ({ params }) => {
                const teamId = Number(params.teamId);

                teams = teams.map((team) =>
                    team.id === teamId
                        ? { ...team, is_active: false }
                        : team
                );

                memberships = memberships.filter(
                    (membership) => membership.team !== teamId
                );

                refreshCapacities();

                return new HttpResponse(null, {
                    status: 204,
                });
            }
        ),

        // Create a membership.
        http.post(
            "/api/memberships/",
            async ({ request }) => {
                const payload = await request.json() as {
                    user: number;
                    team: number;
                    sprint: number;
                };

                const createdMembership: ApiMembership = {
                    id: nextMembershipId++,
                    user: payload.user,
                    team: payload.team,
                    sprint: payload.sprint,
                    role: "DEVELOPER",
                    available_hours: 80,
                    absent_hours: 0,
                    capacity_points: defaultCapacityPoints,
                };

                memberships.push(createdMembership);
                refreshCapacities();

                return HttpResponse.json(createdMembership, {
                    status: 201,
                });
            }
        ),

        // Delete a membership.
        http.delete(
            "/api/memberships/:membershipId/",
            ({ params }) => {
                const membershipId = Number(params.membershipId);

                memberships = memberships.filter(
                    (membership) =>
                        membership.id !== membershipId
                );

                refreshCapacities();

                return new HttpResponse(null, {
                    status: 204,
                });
            }
        )
    );
}

/* -------------------------------------------------------------------------- */
/* Reusable UI test helpers                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Renders the Teams page and waits for the first team to appear.
 */
async function renderTeams() {
    render(<Teams />);

    await screen.findByRole("heading", {
        name: teamOne.name,
    });
}

/**
 * Opens the Create Team modal.
 */
async function openCreateTeamModal() {
    fireEvent.click(
        screen.getByRole("button", {
            name: /New Team/i,
        })
    );

    await screen.findByRole("heading", {
        name: "Create Team",
    });
}

/**
 * Selects a developer from the Create Team dropdown.
 */
async function selectDeveloper(
    user: typeof developerOne
) {
    const search = screen.getByLabelText(/Add Members/i);

    fireEvent.focus(search);

    const dropdown = screen.getByRole("group", {
        name: "Available developers",
    });

    fireEvent.click(
        within(dropdown).getByRole("button", {
            name: new RegExp(developerName(user), "i"),
        })
    );
}

/**
 * Creates a team through the user interface.
 */
async function createTeamThroughUI(name: string) {
    await openCreateTeamModal();

    fireEvent.change(
        screen.getByLabelText(/Team Name/i),
        {
            target: { value: name },
        }
    );

    await selectDeveloper(developerTwo);

    fireEvent.click(
        screen.getByRole("button", {
            name: "Create Team",
        })
    );
}

/* -------------------------------------------------------------------------- */
/* Test setup                                                                 */
/* -------------------------------------------------------------------------- */

describe("Teams", () => {
    beforeEach(() => {
        server.resetHandlers();

        teams = initialTeams.map((team) => ({
            ...team,
        }));

        memberships = initialMemberships.map(
            (membership) => ({ ...membership })
        );

        capacities = initialCapacities.map((capacity) => ({
            ...capacity,
            members: capacity.members.map(
                (member) => ({ ...member })
            ),
        }));

        // Start generated IDs beyond the initial records.
        nextTeamId = createTestId();
        nextMembershipId = createTestId();

        registerTeamsApiHandlers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /* ---------------------------------------------------------------------- */
    /* Initial loading                                                        */
    /* ---------------------------------------------------------------------- */

    it("loads teams, selects the first team and displays its members and capacity", async () => {
        await renderTeams();

        expect(
            screen.getByRole("heading", {
                name: "Team Members",
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText(developerName(developerOne))
        ).toBeInTheDocument();

        expect(
    screen.getAllByText(`${initialCapacityPoints} PTS`)
).toHaveLength(2);

        expect(
            screen.getByRole("button", {
                name: new RegExp(teamOne.name, "i"),
                pressed: true,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText("Total Team Capacity")
        ).toBeInTheDocument();
    });

    it("displays only active developers", async () => {
        await renderTeams();

        expect(
            screen.getByText(developerName(developerOne))
        ).toBeInTheDocument();

        expect(
            screen.getByText(developerName(developerTwo))
        ).toBeInTheDocument();

        expect(
            screen.queryByText(
                developerName(inactiveDeveloper)
            )
        ).not.toBeInTheDocument();
    });

    it("displays developers who are not assigned to a team", async () => {
        await renderTeams();

        expect(
            screen.getByText(developerName(developerTwo))
        ).toBeInTheDocument();
    });

    it("shows the empty state when the backend returns no teams", async () => {
        server.use(
            http.get(API_ENDPOINTS.TEAMS, () =>
                HttpResponse.json([])
            )
        );

        render(<Teams />);

        expect(
            await screen.findByText("No team selected")
        ).toBeInTheDocument();
    });

    it("shows an error when the initial teams request fails", async () => {
        server.use(
            http.get(API_ENDPOINTS.TEAMS, () =>
                HttpResponse.json(
                    { detail: "Unable to load teams." },
                    { status: 500 }
                )
            )
        );

        render(<Teams />);

        await waitFor(() => {
            expect(
                screen.queryByText("Loading teams...")
            ).not.toBeInTheDocument();
        });

        expect(
            screen.getByText("Unable to load teams.")
        ).toBeInTheDocument();
    });

    it("shows an error when the developers request fails", async () => {
        server.use(
            http.get(API_ENDPOINTS.USERS, () =>
                HttpResponse.json(
                    { detail: "Unable to load developers." },
                    { status: 500 }
                )
            )
        );

        render(<Teams />);

        expect(
            await screen.findByText(
                "Unable to load developers."
            )
        ).toBeInTheDocument();
    });

    /* ---------------------------------------------------------------------- */
    /* Team selection and search                                              */
    /* ---------------------------------------------------------------------- */

    it("selects another team and displays its details", async () => {
        await renderTeams();

        const secondTeamButton = screen.getByRole("button", {
            name: new RegExp(teamTwo.name, "i"),
        });

        fireEvent.click(secondTeamButton);

        expect(secondTeamButton).toHaveAttribute(
            "aria-pressed",
            "true"
        );

        expect(
            screen.getByRole("heading", {
                name: teamTwo.name,
            })
        ).toBeInTheDocument();
    });

    it("filters teams by name", async () => {
        await renderTeams();

        const search = screen.getByRole("searchbox", {
            name: "Search teams",
        });

        fireEvent.change(search, {
            target: { value: teamTwo.name },
        });

        expect(
            screen.getByRole("button", {
                name: new RegExp(teamTwo.name, "i"),
            })
        ).toBeInTheDocument();

    const teamList = screen
    .getByRole("heading", {
        name: "Teams",
        level: 2,
    })
    .closest("section");

        if (!teamList) {
            throw new Error("Teams section was not found.");
        }

        expect(
            within(teamList).queryByRole("button", {
                name: new RegExp(teamOne.name, "i"),
            })
        ).not.toBeInTheDocument();
        });

    it("displays an empty search result when no team matches", async () => {
        await renderTeams();

        const search = screen.getByRole("searchbox", {
            name: "Search teams",
        });

        fireEvent.change(search, {
            target: { value: `Unknown-${crypto.randomUUID()}` },
        });

        expect(
            screen.getByText("No teams found.")
        ).toBeInTheDocument();
    });

    /* ---------------------------------------------------------------------- */
    /* Create Team                                                            */
    /* ---------------------------------------------------------------------- */

    it("opens and closes the Create Team modal", async () => {
        await renderTeams();

        await openCreateTeamModal();

        expect(
            screen.getByLabelText(/Team Name/i)
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Cancel",
            })
        );

        expect(
            screen.queryByRole("heading", {
                name: "Create Team",
            })
        ).not.toBeInTheDocument();
    });

    it("requires a team name and at least one developer", async () => {
        await renderTeams();

        await openCreateTeamModal();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Create Team",
            })
        );

        expect(
            screen.getByLabelText(/Team Name/i)
        ).toBeRequired();

        fireEvent.change(
            screen.getByLabelText(/Team Name/i),
            {
                target: { value: `New-${crypto.randomUUID()}` },
            }
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Create Team",
            })
        );

        expect(
            screen.getByRole("alert")
        ).toHaveTextContent(
            "Please select at least one developer."
        );
    });

    it("rejects duplicate team names regardless of letter casing", async () => {
        await renderTeams();

        await openCreateTeamModal();

        fireEvent.change(
            screen.getByLabelText(/Team Name/i),
            {
                target: {
                    value: teamOne.name.toLowerCase(),
                },
            }
        );

        await selectDeveloper(developerTwo);

        fireEvent.click(
            screen.getByRole("button", {
                name: "Create Team",
            })
        );

        expect(
            screen.getByRole("alert")
        ).toHaveTextContent(
            "A team with this name already exists."
        );
    });

    it("creates a team and assigns the selected developer through the API", async () => {
        await renderTeams();

        const newTeamName =
            `Created-${crypto.randomUUID()}`;

        await createTeamThroughUI(newTeamName);

        expect(
            await screen.findByText(
                "Team created and developers assigned successfully!"
            )
        ).toBeInTheDocument();

        expect(
            screen.getByRole("heading", {
                name: newTeamName,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText(developerName(developerTwo))
        ).toBeInTheDocument();

        expect(
    screen.getByRole("button", {
        name: new RegExp(newTeamName, "i"),
        pressed: true,
    })
    ).toBeInTheDocument();
    });

    it("trims whitespace from a team name before creating it", async () => {
        await renderTeams();

        const newTeamName =
            `Trimmed-${crypto.randomUUID()}`;

        await openCreateTeamModal();

        fireEvent.change(
            screen.getByLabelText(/Team Name/i),
            {
                target: {
                    value: `  ${newTeamName}  `,
                },
            }
        );

        await selectDeveloper(developerTwo);

        fireEvent.click(
            screen.getByRole("button", {
                name: "Create Team",
            })
        );

        expect(
            await screen.findByRole("heading", {
                name: newTeamName,
            })
        ).toBeInTheDocument();
    });

    it("shows a backend validation error when team creation fails", async () => {
        server.use(
            http.post(API_ENDPOINTS.TEAMS, () =>
                HttpResponse.json(
                    {
                        name: [
                            "A team with this name already exists.",
                        ],
                    },
                    { status: 400 }
                )
            )
        );

        await renderTeams();
        await openCreateTeamModal();

        fireEvent.change(
            screen.getByLabelText(/Team Name/i),
            {
                target: {
                    value: `New-${crypto.randomUUID()}`,
                },
            }
        );

        await selectDeveloper(developerTwo);

        fireEvent.click(
            screen.getByRole("button", {
                name: "Create Team",
            })
        );

        expect(
            await screen.findByRole("alert")
        ).toHaveTextContent(
            "A team with this name already exists."
        );
    });

    /* ---------------------------------------------------------------------- */
    /* Edit Team                                                              */
    /* ---------------------------------------------------------------------- */

    it("opens Edit Team and updates the team name and description", async () => {
        await renderTeams();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Team actions",
            })
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Edit team",
            })
        );

        expect(
            screen.getByRole("heading", {
                name: "Edit Team",
            })
        ).toBeInTheDocument();

        const updatedName =
            `Updated-${crypto.randomUUID()}`;

        const updatedDescription =
            `Updated-${crypto.randomUUID()}`;

        fireEvent.change(
            screen.getByLabelText("Team Name"),
            {
                target: { value: updatedName },
            }
        );

        fireEvent.change(
            screen.getByLabelText("Description"),
            {
                target: { value: updatedDescription },
            }
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Save Changes",
            })
        );

        expect(
            await screen.findByText(
                "Team updated successfully!"
            )
        ).toBeInTheDocument();

        expect(
            screen.getByRole("heading", {
                name: updatedName,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText(updatedDescription)
        ).toBeInTheDocument();
    });

    it("validates that at least one developer remains when editing a team", async () => {
        await renderTeams();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Team actions",
            })
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Edit team",
            })
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: `Remove ${developerName(developerOne)}`,
            })
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Save Changes",
            })
        );

        expect(
            screen.getByRole("alert")
        ).toHaveTextContent(
            "Please assign at least one developer."
        );
    });

    /* ---------------------------------------------------------------------- */
    /* Membership management                                                  */
    /* ---------------------------------------------------------------------- */

    it("removes a developer from the selected team", async () => {
        await renderTeams();

        const removeButton = screen.getByRole("button", {
            name: `Remove ${developerName(developerOne)} from ${teamOne.name}`,
        });

        fireEvent.click(removeButton);

        expect(
            await screen.findByText(
                "Team member removed successfully!"
            )
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("button", {
                name: `Remove ${developerName(developerOne)} from ${teamOne.name}`,
            })
        ).not.toBeInTheDocument();

        expect(
            screen.getByText(
                "No members assigned to this team yet."
            )
        ).toBeInTheDocument();
    });

    it("adds a developer using the Add Members modal", async () => {
        await renderTeams();

        fireEvent.click(
            screen.getByRole("button", {
                name: "+ Add Members",
            })
        );

        expect(
            screen.getByRole("heading", {
                name: "Add Members",
            })
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("checkbox", {
                name: new RegExp(
                    developerName(developerTwo),
                    "i"
                ),
            })
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Confirm Assignment",
            })
        );

        expect(
            await screen.findByText(
                "Team members added successfully!"
            )
        ).toBeInTheDocument();

        expect(
            screen.getByText(developerName(developerTwo))
        ).toBeInTheDocument();
    });

    it("closes the Add Members modal without changing membership when cancelled", async () => {
        await renderTeams();

        fireEvent.click(
            screen.getByRole("button", {
                name: "+ Add Members",
            })
        );

        expect(
            screen.getByRole("heading", {
                name: "Add Members",
            })
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Cancel",
            })
        );
        expect(
            screen.queryByRole("heading", {
                name: "Add Members",
            })
        ).not.toBeInTheDocument();

        expect(
            screen.getByText(developerName(developerOne))
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("button", {
                name: `Remove ${developerName(developerTwo)} from ${teamOne.name}`,
            })
        ).not.toBeInTheDocument();
    });

    /* ---------------------------------------------------------------------- */
    /* Delete Team                                                            */
    /* ---------------------------------------------------------------------- */

    it("deletes a team after confirmation", async () => {
        const confirmSpy = vi
            .spyOn(window, "confirm")
            .mockReturnValue(true);

        await renderTeams();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Team actions",
            })
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Delete team",
            })
        );

        expect(confirmSpy).toHaveBeenCalled();

        expect(
            await screen.findByText(
                `"${teamOne.name}" deleted successfully!`
            )
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("button", {
                name: new RegExp(teamOne.name, "i"),
            })
        ).not.toBeInTheDocument();

        expect(
            screen.getByRole("heading", {
                name: teamTwo.name,
            })
        ).toBeInTheDocument();
    });

    it("does not delete a team when deletion is cancelled", async () => {
        const confirmSpy = vi
            .spyOn(window, "confirm")
            .mockReturnValue(false);

        await renderTeams();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Team actions",
            })
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Delete team",
            })
        );

        expect(confirmSpy).toHaveBeenCalled();

        expect(
    screen.getByRole("button", {
        name: new RegExp(teamOne.name, "i"),
        pressed: true,
    })
).toBeInTheDocument();

        expect(
            screen.queryByText(
                `"${teamOne.name}" deleted successfully!`
            )
        ).not.toBeInTheDocument();
    });
});
