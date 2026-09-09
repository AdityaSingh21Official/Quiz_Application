import express from "express";
import { authorise } from "../middlewares/authorization.middleware.js";
import { isStudentRole } from "../middlewares/isStudentRole.middleware.js";
import {
  getQuizes,
  generateAttempt,
  startQuiz,
  checkQuiz,
} from "../controllers/student.Controller.js";
const student = express.Router();

student.get("/student/getQuizes", authorise, isStudentRole, getQuizes);
student.post(
  "/student/generateAttempt",
  authorise,
  isStudentRole,
  generateAttempt,
);
student.get("/student/startQuiz/:id", authorise, isStudentRole, startQuiz);

student.post("/student/submitQuiz/:id", authorise, isStudentRole, checkQuiz);

export default student;
