import express from "express";
import { authorise } from "../middlewares/authorization.middleware.js";
import {
  createQuiz,
  getMyQuizes,
  deleteQuiz,
  getThisQuiz,
  updateQuiz,
} from "../controllers/teacher.controllers.js";
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

teacher.get("/teacher/myQuizes", authorise, isTeacher, getMyQuizes);

teacher.delete("/teacher/deleteQuiz", authorise, isTeacher, deleteQuiz);

teacher.get("/teacher/getquiz/:id", authorise, isTeacher, getThisQuiz);

teacher.put(
  "/teacher/updatequiz",
  authorise,
  isTeacher,
  validateQuestions,
  updateQuiz,
);

export default teacher;
