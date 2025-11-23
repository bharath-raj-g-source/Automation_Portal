// C:\Users\BHRAJG2501\Desktop\EPL\project-management\server\src\controllers\eplController.ts

import { Request, Response } from "express";
// 🛑 REMOVE THIS LINE: import { File } from "multer"; 
// The File type is accessed via Express or the Multer namespace

// --- TYPES FOR CONTROLLER & RESPONSE ---

export interface QcSummaryResult {
    id: number;
    description: string;
    action: string;
    status: string;
    total_issues_flagged: number;
}

// 💡 FIX: Access the file type through the Express/Multer namespace.
// Define the exact files structure expected from upload.fields()
interface UploadedFiles {
    rosco_file?: Express.Multer.File[]; // Use the correct type reference
    bsr_file?: Express.Multer.File[];    // Use the correct type reference
    data_file?: Express.Multer.File[];
    macro_file?: Express.Multer.File[];
}

// --- MOCK DATA (omitted for brevity) ---
const MOCK_QC_SUMMARY: QcSummaryResult[] = [
    // ... data
];

// --- CONTROLLER FUNCTION ---

// We still use the standard Express Request type.
export const runQcChecks = async (req: Request, res: Response) => {
  try {
    // 💡 FIX: Cast req.files to the defined interface using the Express.Multer.File type.
    const files = req.files as UploadedFiles;
    
    // 1. FILE VALIDATION
    const rosco_file = files.rosco_file;
    const bsr_file = files.bsr_file;
    
    if (!rosco_file || rosco_file.length === 0 || !bsr_file || bsr_file.length === 0) {
      return res.status(400).json({ detail: "Both Rosco and BSR files are mandatory for QC." });
    }

    // 2. DATA EXTRACTION
    const roscoFile = rosco_file[0];
    const bsrFile = bsr_file[0];
    const dataFile = files.data_file ? files.data_file[0] : null;
    const macroFile = files.macro_file ? files.macro_file[0] : null;

    // Optional: Extract selected checks from the body (sent as a JSON string)
    let selectedChecks: string[] = [];
    if (req.body.selected_checks) {
      selectedChecks = JSON.parse(req.body.selected_checks);
    }
    
    console.log(`Processing QC for BSR: ${bsrFile.originalname}, Rosco: ${roscoFile.originalname}`);
    console.log(`Selected Checks: ${selectedChecks.join(', ')}`);

    // ... (rest of the logic, omitted for brevity)

    // Simulate a delay for processing
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    // Return the summary data array, matching the QcSummaryResult[] type
    return res.status(200).json(MOCK_QC_SUMMARY);

  } catch (error) {
    console.error("QC processing error:", error);
    return res.status(500).json({ detail: "An unexpected error occurred during QC processing." });
  }
};