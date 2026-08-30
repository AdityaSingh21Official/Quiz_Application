import express from "express";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

config();

const port = process.env.PORT || 1024;
const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.resolve(__dirname, "../public")));

app.listen(port, () => {
  try {
    console.log("Server Starting . . . . . .");

    console.log(`Server Started on http://localhost:${port}`);
  } catch (error) {}
});
