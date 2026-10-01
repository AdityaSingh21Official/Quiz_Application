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
        Select sid from student where sid = ?
        `,
      [studentId],
    );

    if (!dbdata || dbdata.length === 0) {
      return res.status(400).json({ message: "Invalid Student ID" });
    }

    await db.query(
      `
        update student set photo_path = ?
        where sid = ?
        `,
      [file.filename, studentId],
    );

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
      message: "Internal Server Errro",
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
