import express, { Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";

/* ROUTE IMPORTS */
import projectRoutes from "./routes/projectRoutes";
import taskRoutes from "./routes/taskRoutes";
import searchRoutes from "./routes/searchRoutes";
import userRoutes from "./routes/userRoutes";
import teamRoutes from "./routes/teamRoutes";
import eplRoutes from "./routes/eplRoutes"

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

/* MULTER SETUP (Temporary storage for file uploads) */
const storage = multer.memoryStorage(); // Store files in memory for processing
const upload = multer({ storage: storage });


/* ROUTES */
app.get("/", (req, res) => {
  res.send("This is home route");
});

app.use("/projects", projectRoutes);
app.use("/tasks", taskRoutes);
app.use("/search", searchRoutes);
app.use("/users", userRoutes);
app.use("/teams", teamRoutes);
app.use("/api", eplRoutes(upload)); // <--- NEW ROUTE MAPPING

/* SERVER */
const port = Number(process.env.PORT) || 8000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on part ${port}`);
});
