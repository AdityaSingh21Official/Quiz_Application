import express from "express";
import { authorise } from "../middlewares/authorization.middleware.js";
import { isStudentRole } from "../middlewares/isStudentRole.middleware.js";
import {
  getQuizes,
  generateAttempt,
  startQuiz,
  checkQuiz,
  myAllResults,
  getThisQuizResult,
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

student.get("/student/myResults", authorise, isStudentRole, myAllResults);

student.put(
  "/student/thisResponse",
  authorise,
  isStudentRole,
  getThisQuizResult,
);

export default student;
