import express from "express";
import {
  teacherAuthenticate,
  studentAuthenticate,
} from "../controllers/login.authenticate.controller.js";

const login = express.Router();

login.post("/login/faculty", teacherAuthenticate);
login.post("/login/student", studentAuthenticate);

export default login;
