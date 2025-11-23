// C:\Users\BHRAJG2501\Desktop\EPL\project-management\server\src\routes\eplRoutes.ts

import express, { Router } from "express";
import multer from "multer";
import { runQcChecks } from "../controllers/eplController";

// NOTE: We export a function that accepts the multer instance
const eplRouter = (upload: multer.Multer): Router => {
  const router = express.Router();

  // 💡 NEW ROUTE: Handles the file upload and QC processing
  // It expects multiple file fields based on your BoardView.tsx FormData:
  // 1. rosco_file
  // 2. bsr_file
  // 3. data_file (Optional)
  // 4. macro_file (Optional)
  // NOTE: It should match the RTK Query URL: /epl/run_qc
  router.post(
    "/run_qc",
    upload.fields([
      { name: 'rosco_file', maxCount: 1 },
      { name: 'bsr_file', maxCount: 1 },
      { name: 'data_file', maxCount: 1 },
      { name: 'macro_file', maxCount: 1 },
    ]),
    runQcChecks
  );
  
  // You can add other EPL related routes here
  
  return router;
};

export default eplRouter;