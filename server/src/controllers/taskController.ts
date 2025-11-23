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

interface MockAttachment {
  id: number;
  fileURL: string;
  fileName: string | null;
  taskId: number;
  uploadedById: number;
}

interface MockComment {
  id: number;
  text: string;
  taskId: number;
  userId: number;
  user?: MockUser; // Added for relation
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

  // Relations (to simulate 'include')
  author?: MockUser;
  assignee?: MockUser;
  comments?: MockComment[];
  attachments?: MockAttachment[];
}

// --- Mock Data Arrays ---

const mockUsers: MockUser[] = [
  { userId: 1, cognitoId: "cog-alice", username: "alice_dev", profilePictureUrl: null, teamId: 101 },
  { userId: 2, cognitoId: "cog-bob", username: "bob_pm", profilePictureUrl: null, teamId: 102 },
  { userId: 3, cognitoId: "cog-charlie", username: "charlie_qa", profilePictureUrl: null, teamId: 101 },
];

const mockAttachments: MockAttachment[] = [
    { id: 1, fileURL: "http://files/spec.pdf", fileName: "Project Spec", taskId: 101, uploadedById: 1 },
    { id: 2, fileURL: "http://files/mockup.png", fileName: "UI Mockup", taskId: 102, uploadedById: 2 },
];

const mockComments: MockComment[] = [
    { id: 1, text: "Looks good, I'll start tomorrow.", taskId: 101, userId: 2 },
    { id: 2, text: "Blocked by design review.", taskId: 102, userId: 1 },
];

// 🚀 FIXED: Ensure all tasks have valid, non-null Date objects for Gantt chart
let mockTasks: MockTask[] = [
  { 
    id: 101, 
    title: "Implement Auth Middleware", 
    description: "Secure all API endpoints using JWT.", 
    status: "To Do", 
    priority: "Urgent", 
    tags: "backend", 
    startDate: new Date("2025-11-10"), // FIXED
    dueDate: new Date("2025-11-20"), 
    points: 8, 
    projectId: 10, 
    authorUserId: 1, 
    assignedUserId: 2 
  },
  { 
    id: 102, 
    title: "Design Landing Page UI", 
    description: "Sketch and finalize the main landing page components.", 
    status: "Work In Progress", 
    priority: "High", 
    tags: "frontend", 
    startDate: new Date("2025-11-15"), // FIXED
    dueDate: new Date("2025-11-25"), 
    points: 5, 
    projectId: 11, 
    authorUserId: 2, 
    assignedUserId: 1 
  },
  { 
    id: 103, 
    title: "Database Schema Review", 
    description: "Final check for all model relationships.", 
    status: "Completed", 
    priority: "Medium", 
    tags: "backend", 
    startDate: new Date("2025-11-01"), 
    dueDate: new Date("2025-11-10"), 
    points: 3, 
    projectId: 10, 
    authorUserId: 3, 
    assignedUserId: 3 
  },
  { 
    id: 104, 
    title: "Deploy to Staging", 
    description: "Prepare and run staging deployment pipeline.", 
    status: "To Do", 
    priority: "High", 
    tags: "devops", 
    startDate: new Date("2025-11-25"), 
    dueDate: new Date("2025-11-27"), 
    points: 5, 
    projectId: 11, 
    authorUserId: 3, 
    assignedUserId: 1 
  },
];

let nextTaskId = mockTasks.length > 0 ? Math.max(...mockTasks.map(t => t.id)) + 1 : 1;

// --- END OF MOCK DATA ---
// -------------------------------------------------------------

/**
 * Helper function to simulate Prisma's 'include' (eager loading relations)
 */
const includeRelations = (task: MockTask): MockTask => {
    // Look up relations and assign them
    task.author = mockUsers.find(u => u.userId === task.authorUserId);
    task.assignee = mockUsers.find(u => u.userId === task.assignedUserId);
    task.comments = mockComments.filter(c => c.taskId === task.id).map(comment => {
        // Also include the user on the comment
        comment.user = mockUsers.find(u => u.userId === comment.userId);
        return comment;
    });
    task.attachments = mockAttachments.filter(a => a.taskId === task.id);
    return task;
};


// -------------------------------------------------------------
// --- MOCK CONTROLLER FUNCTIONS ---
// -------------------------------------------------------------

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  const projectId = Number(req.query.projectId);

  try {
    // ⬇️ REPLACED PRISMA CALL
    const tasks = mockTasks
      .filter(task => task.projectId === projectId)
      .map(includeRelations); // Simulate 'include'

    res.json(tasks);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving tasks: ${error.message}` });
  }
};

export const createTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    title,
    description,
    status,
    priority,
    tags,
    startDate,
    dueDate,
    points,
    projectId,
    authorUserId,
    assignedUserId,
  } = req.body;

  try {
    // ⬇️ REPLACED PRISMA CALL
    const newTask: MockTask = {
      id: nextTaskId++,
      title,
      description: description || null,
      status: status || 'To Do',
      priority: priority || 'Medium',
      tags: tags || null,
      // Ensure dates are parsed as Date objects
      startDate: startDate ? new Date(startDate) : null, 
      dueDate: dueDate ? new Date(dueDate) : null,
      points: points || 0,
      projectId: Number(projectId),
      authorUserId: Number(authorUserId),
      assignedUserId: assignedUserId ? Number(assignedUserId) : null,
    };
    
    // Check if the new task's dates are null, and if so, it may still fail the Gantt chart.
    // If you need a fallback, you could add:
    // if (!newTask.startDate) newTask.startDate = new Date();
    // if (!newTask.dueDate) newTask.dueDate = new Date();

    mockTasks.push(newTask); // "Save" the new task
    
    // Simulate fetching the newly created task with relations
    res.status(201).json(includeRelations(newTask)); 
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating a task: ${error.message}` });
  }
};

export const updateTaskStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const taskId = Number(req.params.taskId);
  const { status } = req.body;
  
  try {
    // ⬇️ REPLACED PRISMA CALL
    const taskIndex = mockTasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      res.status(404).json({ message: `Task with ID ${taskId} not found.` });
      return;
    }

    // Update the status
    mockTasks[taskIndex].status = status;
    const updatedTask = mockTasks[taskIndex];

    res.json(updatedTask);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating task: ${error.message}` });
  }
};

export const getUserTasks = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = Number(req.params.userId);
  try {
    // ⬇️ REPLACED PRISMA CALL
    const tasks = mockTasks
      .filter(task => task.authorUserId === userId || task.assignedUserId === userId)
      .map(includeRelations); // Simulate 'include' (author and assignee are handled here)
      
    res.json(tasks);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving user's tasks: ${error.message}` });
  }
};