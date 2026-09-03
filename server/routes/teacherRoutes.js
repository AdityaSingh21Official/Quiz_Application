import express from "express";
import { authorise } from "../middlewares/authorization.middleware.js";
import { createQuiz } from "../controllers/teacher.controllers.js";
import { isTeacher } from "../middlewares/teacherRoleRequired.middleware.js";
import { validateQuestions } from "../middlewares/validateQuestions.middleware.js";

const teacher = express.Router();

teacher.post(
  "/teacher/createQuiz",
  authorise,
  isTeacher,
  validateQuestions,
  createQuiz,
);

export default teacher;
