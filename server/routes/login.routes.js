import express from "express";
import {
  teacherAuthenticate,
  studentAuthenticate,
} from "../controllers/login.authenticate.controller.js";

import { authorise } from "../middlewares/authorization.middleware.js";

const login = express.Router();

login.post("/login/faculty", teacherAuthenticate);
login.post("/login/student", studentAuthenticate);
login.get("/postLogin/authorize", authorise, (req, res) => {
  res.status(200).json({
    message: "Authorised User",
    user: req.user,
  });
});
export default login;
