// C:\Users\BHRAJG2501\Desktop\EPL\project-management\server\src\controllers\projectController.ts

import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client"; // <--- Comment out or remove this line

// const prisma = new PrismaClient(); // <--- Comment out or remove this line

// --- ⚠️ START OF DUMMY DATA ---

// Define a type that matches the Prisma Project model for better type safety
interface MockProject {
  id: number;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

// Global variable to hold and manipulate mock project data
let mockProjects: MockProject[] = [
  {
    id: 1,
    name: "Website Redesign",
    description: "Complete overhaul of the company's main website layout and UX.",
    startDate: new Date("2025-10-01"),
    endDate: new Date("2025-12-31"),
  },
  {
    id: 2,
    name: "Mobile App MVP",
    description: "Develop the Minimum Viable Product for the new iOS/Android app.",
    startDate: new Date("2026-01-15"),
    endDate: null, // No end date yet
  },
  {
    id: 3,
    name: "Internal Tooling Update",
    description: "Upgrade and patch existing CI/CD pipelines and logging systems.",
    startDate: new Date("2025-08-20"),
    endDate: new Date("2025-11-01"),
  },
];

// Helper to get the next ID for new projects
let nextProjectId = mockProjects.length > 0 ? Math.max(...mockProjects.map(p => p.id)) + 1 : 1;

// --- END OF DUMMY DATA ---
// -------------------------------------------------------------

export const getProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // ⬇️ REPLACED PRISMA CALL with DUMMY DATA
    // const projects = await prisma.project.findMany();
    const projects = mockProjects; 
    
    res.json(projects);
  } catch (error: any) {
    // This catch block is unlikely to be hit with dummy data, 
    // but kept for consistency.
    res
      .status(500)
      .json({ message: `Error retrieving projects: ${error.message}` });
  }
};

export const createProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { name, description, startDate, endDate } = req.body;

  // Basic validation (optional but good practice)
  if (!name) {
    res.status(400).json({ message: "Project name is required." });
    return;
  }

  try {
    // ⬇️ REPLACED PRISMA CALL with DUMMY DATA
    // const newProject = await prisma.project.create({ ... });
    const newProject: MockProject = {
      id: nextProjectId++,
      name,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    };
    
    mockProjects.push(newProject); // "Save" the new project to the mock array
    
    res.status(201).json(newProject);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating a project: ${error.message}` });
  }
};