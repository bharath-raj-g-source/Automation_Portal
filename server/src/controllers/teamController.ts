import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client"; // COMMENTED OUT for mock

// const prisma = new PrismaClient(); // COMMENTED OUT for mock

// --- ⚠️ START OF MOCK DATA STRUCTURES ---

// Define Mock Data Interfaces (matching your Prisma Schema)
interface MockUser {
  userId: number;
  cognitoId: string;
  username: string;
  profilePictureUrl: string | null;
  teamId: number | null;
}

interface MockTeam {
  id: number;
  teamName: string;
  productOwnerUserId: number | null;
  projectManagerUserId: number | null;
}

// --- Mock Data Arrays ---

const mockUsers: MockUser[] = [
  { userId: 1, cognitoId: "cog-alice", username: "alice_dev", profilePictureUrl: null, teamId: 101 },
  { userId: 2, cognitoId: "cog-bob", username: "bob_pm", profilePictureUrl: null, teamId: 102 },
  { userId: 3, cognitoId: "cog-charlie", username: "charlie_qa", profilePictureUrl: null, teamId: 101 },
  { userId: 4, cognitoId: "cog-diana", username: "diana_po", profilePictureUrl: null, teamId: 103 },
];

const mockTeams: MockTeam[] = [
  { id: 101, teamName: "Frontend Ninjas", productOwnerUserId: 4, projectManagerUserId: 2 },
  { id: 102, teamName: "Backend Wizards", productOwnerUserId: 4, projectManagerUserId: 2 },
  { id: 103, teamName: "DevOps Masters", productOwnerUserId: 1, projectManagerUserId: 3 },
  { id: 104, teamName: "Marketing", productOwnerUserId: null, projectManagerUserId: null }, // Team without assigned managers
];

// --- END OF MOCK DATA ---
// -------------------------------------------------------------

// -------------------------------------------------------------
// --- MOCK CONTROLLER FUNCTION ---
// -------------------------------------------------------------

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    // ⬇️ REPLACED prisma.team.findMany()
    const teams = mockTeams;

    // Helper function to find user username by ID (simulating prisma.user.findUnique)
    const findUsername = (userId: number | null): string | undefined => {
      if (!userId) return undefined;
      const user = mockUsers.find(u => u.userId === userId);
      return user?.username;
    };

    // ⬇️ REPLACED Prisma user lookups with mock data lookups
    const teamsWithUsernames = await Promise.all(
      teams.map(async (team) => { // NOTE: Removed the 'any' type cast
        // Simulate async lookup
        const productOwnerUsername = findUsername(team.productOwnerUserId);
        const projectManagerUsername = findUsername(team.projectManagerUserId);

        return {
          ...team,
          productOwnerUsername,
          projectManagerUsername,
        };
      })
    );

    res.json(teamsWithUsernames);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving teams: ${error.message}` });
  }
};