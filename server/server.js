import express from "express";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { testConnection } from "./database/db.config.js";
import loginRoutes from "./routes/login.routes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

config();

const port = process.env.PORT || 1024;
const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.resolve(__dirname, "../public")));

app.use("/api", loginRoutes);
app.use("/api", teacherRoutes);
app.use("/api", studentRoutes);

app.listen(port, async () => {
  try {
    console.log("\nServer Starting . . . . . .");

    await testConnection();

    console.log(`Server Started on http://localhost:${port}`);
  } catch (error) {
    throw new Error(error);
  }
});
