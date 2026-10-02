import fs from "fs/promises";
import path from "path";
import { TEMP_DIR } from "../middlewares/temp.frame.middleware.js";
import { db } from "../database/db.config.js";

/* function cosineSimilarity(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
 */
async function checkTempFrame(req, res) {
  const attemptId = req.params.attemptToken;
  const file = req.file;

  function cleanup() {
    if (file) {
      return fs.unlink(file.path).catch((err) => {});
    } else {
      return null;
    }
  }

  try {
    if (!file) return res.status(400).json({ message: "Image is required" });

    const [data] = await db.query(
      `
        select f.sid, f.embeding from face_embeding f 
        inner join attempts a 
        on a.sid = f.sid 
        where a.attempt_token = ?;
        `,
      attemptId,
    );

    if (!data || data.length === 0 || data[0]["embeding"] === null) {
      await cleanup();
      return res.status(400).json({
        message: "Student Face not Registered, Please contact your faculty",
      });
    }

    let stored = data[0]["embeding"];
    if (typeof stored === "string") stored = JSON.parse(stored);

    const resPy = await fetch("http://127.0.0.1:8000/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: file.filename,
        attempt_token: attemptId,
        embedding: stored,
      }),
      signal: AbortSignal.timeout(6000),
    }).catch(() => {
      throw new Error("PYTHON SERVICE UNREACHABLE");
    });

    const pyData = await resPy.json();
    await cleanup();
    if (!resPy.ok) throw new Error("PYTHON SERVICE ERROR: " + resPy.status);

    return res
      .status(200)
      .json({ match: pyData.match, message: pyData.message });
  } catch (error) {
    await cleanup();

    console.log(
      "CONTROLLER ERROR : temp.frame.controller {checkTempFram}\n" + error,
    );

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export { checkTempFrame };
