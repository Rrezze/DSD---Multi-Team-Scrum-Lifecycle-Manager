
import {
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";

import "@testing-library/jest-dom/vitest";

import { describe, expect, it } from "vitest";

import Teams from "../teams";
import {
    mockTeams,
    mockUnassignedDevelopers,
} from "../teamsMockData";

// Generate unique team names so tests do not depend on
// particular names or duplicate existing mock teams.
let teamNameCounter = 0;

const createUniqueTeamName = () => {
    teamNameCounter += 1;
    return `Test Team ${teamNameCounter}`;
};

// Escape special characters when using dynamic values in regular expressions.
const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Reusable helper to open the Create Team modal.
const openCreateTeamForm = () => {
    fireEvent.click(
        screen.getByRole("button", { name: /New Team/i })
    );
};

// Reusable helper to open the Edit Team modal.
const openEditTeamForm = () => {
    fireEvent.click(
        screen.getByRole("button", { name: "Team actions" })
    );

    fireEvent.click(
        screen.getByRole("button", { name: /Edit team/i })
    );
};

// Reusable helper to select a developer from the available list.
const selectAvailableDeveloper = (developer: typeof mockUnassignedDevelopers[number]) => {
    const developerSearch = screen.getByRole("searchbox", {
        name: /Add Members/i,
    });

    fireEvent.focus(developerSearch);

    const developerDropdown = screen.getByRole("group", {
        name: "Available developers",
    });

    const developerButton = within(developerDropdown).getByRole(
        "button",
        {
            name: new RegExp(
                escapeRegExp(developer.name),
                "i"
            ),
        }
    );

    fireEvent.click(developerButton);
};

// Reusable helper to fill and submit the Create Team form.
const createTeam = (
    teamName: string,
    developer = mockUnassignedDevelopers[0]
) => {
    openCreateTeamForm();

    fireEvent.change(screen.getByLabelText(/Team Name/i), {
        target: { value: teamName },
    });

    selectAvailableDeveloper(developer);

    fireEvent.click(
        screen.getByRole("button", { name: "Create Team" })
    );
};

describe("Teams page", () => {

    // Test 1: Verify that the Teams page renders its initial data.
    it("renders the Teams page and initially selected team", () => {
        render(<Teams />);

        const initialTeam = mockTeams[0];

        expect(
            screen.getByRole("heading", {
                name: initialTeam.name,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByRole("heading", {
                name: "Team Members",
            })
        ).toBeInTheDocument();
    });

    // Test 2: Verify that the Create Team modal opens.
    it("opens the Create Team modal", () => {
        render(<Teams />);

        openCreateTeamForm();

        expect(
            screen.getByRole("heading", {
                name: "Create Team",
            })
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText(/Team Name/i)
        ).toBeInTheDocument();
    });

    // Test 3: Prevent creating a team with an existing name.
    it("prevents creating a team with an existing name", () => {
        render(<Teams />);

        openCreateTeamForm();

        const existingTeamName = mockTeams[0].name;

        fireEvent.change(screen.getByLabelText(/Team Name/i), {
            target: {
                value: existingTeamName.toLowerCase(),
            },
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Create Team" })
        );

        expect(screen.getByRole("alert")).toHaveTextContent(
            "A team with this name already exists."
        );
    });

    // Test 4: Require at least one developer when creating a team.
    it("prevents creating a team without selecting a developer", () => {
        render(<Teams />);

        openCreateTeamForm();

        fireEvent.change(screen.getByLabelText(/Team Name/i), {
            target: {
                value: createUniqueTeamName(),
            },
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Create Team" })
        );

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Please select at least one developer."
        );
    });

    // Test 5: Create a team using available mock developer data.
    it("creates a team after selecting a developer", () => {
        render(<Teams />);

        const newTeamName = createUniqueTeamName();
        const developer = mockUnassignedDevelopers[0];

        createTeam(newTeamName, developer);

        expect(
            screen.getByRole("heading", {
                name: newTeamName,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText(developer.name)
        ).toBeInTheDocument();
    });

    // Test 6: Open Edit Team through the team actions menu.
    it("opens the Edit Team modal", () => {
        render(<Teams />);

        openEditTeamForm();

        expect(
            screen.getByRole("heading", {
                name: "Edit Team",
            })
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: "Save Changes",
            })
        ).toBeInTheDocument();
    });

    // Test 7: Update team details.
    it("updates the selected team's name and description", () => {
        render(<Teams />);

        const updatedTeamName = createUniqueTeamName();
        const updatedDescription = `Updated description ${teamNameCounter}`;

        openEditTeamForm();

        fireEvent.change(screen.getByLabelText(/Team Name/i), {
            target: {
                value: updatedTeamName,
            },
        });

        fireEvent.change(screen.getByLabelText(/Description/i), {
            target: {
                value: updatedDescription,
            },
        });

        fireEvent.click(
            screen.getByRole("button", {
                name: "Save Changes",
            })
        );

        expect(
            screen.getByRole("heading", {
                name: updatedTeamName,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText(updatedDescription)
        ).toBeInTheDocument();

        expect(
            screen.getByText("Team updated successfully!")
        ).toBeInTheDocument();
    });

    // Test 8: Remove a developer from the selected team.
    it("removes a developer from the selected team", () => {
        render(<Teams />);

        const initialTeam = mockTeams[0];
        const developer = initialTeam.members[0].user;

        const removeButtonName =
            `Remove ${developer.name} from ${initialTeam.name}`;

        expect(
            screen.getByRole("button", {
                name: removeButtonName,
            })
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("button", {
                name: removeButtonName,
            })
        );

        expect(
            screen.queryByRole("button", {
                name: removeButtonName,
            })
        ).not.toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: `Drag ${developer.name} to assign to a team`,
            })
        ).toBeInTheDocument();
    });

    // Test 9: Verify that the team name field is required.
    it("requires a team name before creating a team", () => {
        render(<Teams />);

        openCreateTeamForm();

        const teamNameInput = screen.getByLabelText(/Team Name/i);

        expect(teamNameInput).toBeRequired();
        expect(teamNameInput).toBeInvalid();
    });

    // Test 10: Reject a team name containing only whitespace.
    it("rejects a team name containing only spaces", () => {
        render(<Teams />);

        openCreateTeamForm();

        fireEvent.change(screen.getByLabelText(/Team Name/i), {
            target: {
                value: "     ",
            },
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Create Team" })
        );

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Please enter a team name."
        );
    });

    // Test 11: Verify that surrounding whitespace is removed.
    it("trims whitespace from a team name before creating it", () => {
        render(<Teams />);

        const newTeamName = createUniqueTeamName();
        const developer = mockUnassignedDevelopers[0];

        createTeam(`  ${newTeamName}  `, developer);

        expect(
            screen.getByRole("heading", {
                name: newTeamName,
            })
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("heading", {
                name: `  ${newTeamName}  `,
            })
        ).not.toBeInTheDocument();
    });

    // Test 12: Cancel the Create Team operation.
    it("closes the Create Team modal when cancelled", () => {
        render(<Teams />);

        const initialTeam = mockTeams[0];

        openCreateTeamForm();

        expect(
            screen.getByRole("heading", {
                name: "Create Team",
            })
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("button", {
                name: /Cancel/i,
            })
        );

        expect(
            screen.queryByRole("heading", {
                name: "Create Team",
            })
        ).not.toBeInTheDocument();

        expect(
            screen.getByRole("heading", {
                name: initialTeam.name,
            })
        ).toBeInTheDocument();
    });

    // Test 13: Switch between teams.
    it("allows selecting another team", () => {
        render(<Teams />);

        const anotherTeam = mockTeams[1];

        const teamButton = screen.getByRole("button", {
            name: new RegExp(
                escapeRegExp(anotherTeam.name),
                "i"
            ),
        });

        fireEvent.click(teamButton);

        expect(teamButton).toHaveAttribute(
            "aria-pressed",
            "true"
        );

        expect(
            screen.getByRole("heading", {
                name: anotherTeam.name,
            })
        ).toBeInTheDocument();
    });

    
    // Test 14: Search teams using their names from mock data.
    it("filters teams using the team search field", () => {
        render(<Teams />);

        const teamToFind = mockTeams[1];
        const anotherTeam = mockTeams[0];

        // Locate the Team List section rather than searching the whole page.
        const teamListHeading = screen.getByRole("heading", {
            name: "Teams",
            level: 2,
        });

        const teamListSection = teamListHeading.closest("section");

        expect(teamListSection).not.toBeNull();

        const teamList = within(teamListSection!);

        const searchInput = teamList.getByRole("searchbox", {
            name: "Search teams",
        });

        fireEvent.change(searchInput, {
            target: {
                value: teamToFind.name,
            },
        });

        // The matching team should remain visible in the Team List.
        expect(
            teamList.getByRole("button", {
                name: new RegExp(
                    escapeRegExp(teamToFind.name),
                    "i",
                ),
            })
        ).toBeInTheDocument();

        // Other teams should no longer appear in the Team List.
        expect(
            teamList.queryByRole("button", {
                name: new RegExp(
                    escapeRegExp(anotherTeam.name),
                    "i",
                ),
            })
        ).not.toBeInTheDocument();
    });


});
