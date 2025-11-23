import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client"; // COMMENTED OUT: Not needed for mock implementation

// const prisma = new PrismaClient(); // COMMENTED OUT: Not needed for mock implementation

// --- ⚠️ START OF MOCK DATA STRUCTURES ---

// Define Mock Data Interfaces (matching your Prisma Schema)
interface MockUser {
    userId: number;
    cognitoId: string;
    username: string;
    profilePictureUrl: string | null;
    teamId: number | null;
}

interface MockProject {
    id: number;
    name: string;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
}

interface MockTask {
    id: number;
    title: string;
    description: string | null;
    status: string | null;
    priority: string | null;
    tags: string | null;
    startDate: Date | null;
    dueDate: Date | null;
    points: number | null;
    projectId: number;
    authorUserId: number;
    assignedUserId: number | null;
}

// --- Mock Data Arrays ---

const mockUsers: MockUser[] = [
    { userId: 1, cognitoId: "cog-123", username: "alice_dev", profilePictureUrl: null, teamId: 101 },
    { userId: 2, cognitoId: "cog-456", username: "bob_pm", profilePictureUrl: null, teamId: 102 },
    { userId: 3, cognitoId: "cog-789", username: "charlie_qa", profilePictureUrl: null, teamId: 101 },
];

const mockProjects: MockProject[] = [
    { id: 10, name: "Alpha Release 2026", description: "Phase I: Core backend functionality.", startDate: new Date("2025-10-01"), endDate: new Date("2026-03-31") },
    { id: 11, name: "Beta App Launch", description: "Focus on user testing and UI/UX polish.", startDate: new Date("2026-04-01"), endDate: null },
    { id: 12, name: "Docs Portal Update", description: "Create comprehensive documentation for API.", startDate: new Date("2025-11-01"), endDate: new Date("2025-12-31") },
];

// 🚀 UPDATED mockTasks: Ensure all startDate and dueDate fields are valid Date objects.
const mockTasks: MockTask[] = [
    { 
        id: 101, 
        title: "Implement Auth Middleware", 
        description: "Secure all API endpoints using JWT.", 
        status: "To Do", 
        priority: "Urgent", 
        tags: "backend, security", 
        points: 8, 
        projectId: 10, 
        authorUserId: 1, 
        assignedUserId: 2,
        startDate: new Date("2025-11-10"), // FIXED: Was null
        dueDate: new Date("2025-11-20"), 
    },
    { 
        id: 102, 
        title: "Design Landing Page UI", 
        description: "Sketch and finalize the main landing page components.", 
        status: "Work In Progress", 
        priority: "High", 
        tags: "frontend, design", 
        points: 5, 
        projectId: 11, 
        authorUserId: 2, 
        assignedUserId: 1,
        startDate: new Date("2025-11-15"), // FIXED: Was null
        dueDate: new Date("2025-11-25"), 
    },
    { 
        id: 103, 
        title: "Database Schema Review", 
        description: "Final check for all model relationships.", 
        status: "Completed", 
        priority: "Medium", 
        tags: "backend, infra", 
        points: 3, 
        projectId: 10, 
        authorUserId: 3, 
        assignedUserId: 3,
        startDate: new Date("2025-11-01"), 
        dueDate: new Date("2025-11-05"), // Adjusted end date for a shorter task duration
    },
];

// --- END OF MOCK DATA ---
// -------------------------------------------------------------

/**
 * Helper function to perform case-insensitive containment check, 
 * simulating Prisma's `contains` behavior.
 */
const containsIgnoreCase = (text: string | null | undefined, search: string): boolean => {
    return text ? text.toLowerCase().includes(search) : false;
};


// -------------------------------------------------------------
// --- MOCK CONTROLLER FUNCTION ---
// -------------------------------------------------------------

export const search = async (req: Request, res: Response): Promise<void> => {
    // Extract the query string from the request
    const { query } = req.query;
    const searchQuery = (query as string | undefined)?.toLowerCase();

    if (!searchQuery) {
        // If no query is provided, return an empty set of results
        res.json({ tasks: [], projects: [], users: [] });
        return;
    }

    try {
        // 1. Mock Task Search (simulating search on title OR description)
        const tasks = mockTasks.filter(task =>
            containsIgnoreCase(task.title, searchQuery) ||
            containsIgnoreCase(task.description, searchQuery)
        );

        // 2. Mock Project Search (simulating search on name OR description)
        const projects = mockProjects.filter(project =>
            containsIgnoreCase(project.name, searchQuery) ||
            containsIgnoreCase(project.description, searchQuery)
        );

        // 3. Mock User Search (simulating search on username)
        const users = mockUsers.filter(user =>
            containsIgnoreCase(user.username, searchQuery)
        );

        // Return the combined search results
        res.json({ tasks, projects, users });

    } catch (error: any) {
        // Return a mock error response
        res
            .status(500)
            .json({ message: `Error performing mock search: ${error.message}` });
    }
};