import { db } from "../database/db.config.js";
import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

async function teacherAuthenticate(req, res) {
  try {
    const { id, password } = req.body;

    const [response] = await db.query("select * from admin where aid = ?", [
      id,
    ]);

    console.log(response["apassword"]);

    if (!response || response.length === 0) {
      return res.status(401).json({
        success: false,
        message: "invalid id or password",
      });
    }

    if (password !== response[0]["apassword"]) {
      return res.status(401).json({
        success: false,
        message: "invalid id or password",
      });
    }

    const token = jwt.sign(
      {
        userId: id,
        role: "teacher",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      },
    );

    let now = new Date();

    await db.query("insert into logs(log_text, log_TD) values(?, ?)", [
      `User ${id} Logged In`,
      now.toLocaleString(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Login Succesfull",
      token,
    });
  } catch (error) {
    console.log("Login Error" + error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
async function studentAuthenticate(req, res) {
  try {
    const { id, password } = req.body;

    const [response] = await db.query(
      "select sid, spassword from student where sid = ?",
      [id],
    );

    if (!response || response.length === 0) {
      return res.status(401).json({
        success: false,
        message: "invalid id or password",
      });
    }

    if (password !== response[0]["spassword"]) {
      return res.status(401).json({
        success: false,
        message: "invalid id or password",
      });
    }

    const token = jwt.sign(
      {
        userId: id,
        role: "student",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      },
    );

    let now = new Date();

    await db.query("insert into logs(log_text, log_TD) values(?, ?)", [
      `User ${id} Logged In`,
      now.toLocaleString(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Login Succesfull",
      token,
    });
  } catch (error) {
    console.log("Login Error" + error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export { teacherAuthenticate, studentAuthenticate };
