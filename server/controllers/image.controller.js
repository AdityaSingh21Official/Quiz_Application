import { db } from "../database/db.config.js";
import fs from "fs/promises";
import path from "path";
import { STUDENT_DIR } from "../middlewares/imgUpload.middleware.js";

async function registerNewStudentPhoto(req, res) {
  const { studentId } = req.body;
  const file = req.file;

  function cleanup() {
    if (file) {
      return fs.unlink(file.path).catch((err) => {});
    } else {
      return null;
    }
  }
  try {
    const userIdRegex = /^[0-9]{5,5}$/;

    if (!userIdRegex.test(studentId)) {
      await cleanup();
      return res.status(400).json({ message: "Invalid Student ID" });
    }
    if (!file) {
      await cleanup();
      return res.status(400).json({ message: "Image is Required" });
    }

    const [dbdata] = await db.query(
      `
        Select sid, photo_path from student where sid = ?
        `,
      [studentId],
    );

    if (!dbdata || dbdata.length === 0) {
      await cleanup();
      return res.status(400).json({ message: "Invalid Student ID" });
    }

    const pyRes = await fetch("http://127.0.0.1:8000/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: file.filename }),
      signal: AbortSignal.timeout(15000),
    }).catch(() => {
      throw new Error("PYTHON SERVICE UNREACHABLE");
    });

    const data = await pyRes.json();

    if (pyRes.status === 400) {
      await cleanup();
      return res.status(400).json({ message: data.detail });
    }
    if (!pyRes.ok) {
      throw new Error("PYTHON SERVICE ERROR: " + pyRes.status);
    }
    if (!Array.isArray(data.embedding) || data.embedding.length !== 512) {
      throw new Error("PYTHON SERVICE ERROR: bad embedding");
    }

    await db.query("INSERT IGNORE INTO face_embeding(sid) VALUES(?)", [
      studentId,
    ]);

    const embeding = JSON.stringify(data["embedding"]);
    await db.query(
      `
      UPDATE student s JOIN face_embeding f ON s.sid = f.sid
      SET s.photo_path = ?, f.embeding = ?
      WHERE s.sid = ?
      `,
      [file.filename, embeding, studentId],
    );

    const oldPhoto = dbdata[0]["photo_path"];
    if (oldPhoto && oldPhoto !== file.filename) {
      await fs.unlink(path.join(STUDENT_DIR, oldPhoto)).catch(() => {});
    }

    return res.json({
      message: "Student Photo Registered",
    });
  } catch (error) {
    await cleanup();

    console.log(
      "CONTROLLER ERROR : registration.controller {registerNewStudentPhoto}\n" +
        error,
    );

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function getStudentPhoto(req, res) {
  try {
    const { studentId } = req.body;

    const userIdRegex = /^[0-9]{5,5}$/;

    if (!userIdRegex.test(studentId))
      return res.status(400).json({ message: "Invalid Student ID" });

    const [data] = await db.query(
      "select photo_path from student where sid = ?",
      [studentId],
    );

    if (!data.length)
      return res.status(400).json({ message: "Invalid Student ID" });

    res.sendFile(path.join(STUDENT_DIR, data[0]["photo_path"]));
  } catch (error) {
    console.log(
      "CONTROLLER ERROR : registration.controller {getStudentPhoto}\n" + error,
    );
    return res.status(500).json({
      message: "Internal Server Errro",
    });
  }
}

export { registerNewStudentPhoto, getStudentPhoto };
