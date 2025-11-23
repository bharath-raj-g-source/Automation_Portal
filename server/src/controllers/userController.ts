import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client"; // COMMENTED OUT for mock

// const prisma = new PrismaClient(); // COMMENTED OUT for mock

// --- ⚠️ START OF MOCK DATA STRUCTURES ---

// Define Mock Data Interface (matching your Prisma User Schema)
interface MockUser {
  userId: number;
  cognitoId: string;
  username: string;
  profilePictureUrl: string | null;
  teamId: number | null;
}

// Global variable to hold and manipulate mock user data
let mockUsers: MockUser[] = [
  { userId: 1, cognitoId: "cog-alice", username: "alice_dev", profilePictureUrl: "i1.jpg", teamId: 101 },
  { userId: 2, cognitoId: "cog-bob", username: "bob_pm", profilePictureUrl: "i2.jpg", teamId: 102 },
  { userId: 3, cognitoId: "cog-charlie", username: "charlie_qa", profilePictureUrl: null, teamId: 101 },
];

let nextUserId = mockUsers.length > 0 ? Math.max(...mockUsers.map(u => u.userId)) + 1 : 1;

// --- END OF MOCK DATA ---
// -------------------------------------------------------------

// -------------------------------------------------------------
// --- MOCK CONTROLLER FUNCTIONS ---
// -------------------------------------------------------------

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // ⬇️ REPLACED prisma.user.findMany()
    const users = mockUsers;
    res.json(users);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving users: ${error.message}` });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  try {
    // ⬇️ REPLACED prisma.user.findUnique()
    const user = mockUsers.find(u => u.cognitoId === cognitoId) || null; // Use null if not found to match typical DB behavior

    if (!user) {
      res.status(404).json({ message: `User with cognitoId ${cognitoId} not found.` });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving user: ${error.message}` });
  }
};

export const postUser = async (req: Request, res: Response) => {
  try {
    const {
      username,
      cognitoId,
      profilePictureUrl = "i1.jpg",
      teamId = 1,
    } = req.body;

    // Optional: Prevent creating a user if cognitoId already exists in mock data
    if (mockUsers.some(u => u.cognitoId === cognitoId)) {
        res.status(409).json({ message: "User with this cognitoId already exists." });
        return;
    }

    // ⬇️ REPLACED prisma.user.create()
    const newUser: MockUser = {
        userId: nextUserId++,
        username,
        cognitoId,
        profilePictureUrl: profilePictureUrl || null,
        teamId: Number(teamId) || null,
    };
    
    mockUsers.push(newUser); // "Save" the new user

    res.json({ message: "User Created Successfully", newUser });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating user: ${error.message}` });
  }
};