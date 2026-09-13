import express from "express";
import { authorise } from "../middlewares/authorization.middleware.js";
import {
  createQuiz,
  getMyQuizes,
  deleteQuiz,
  getThisQuiz,
  updateQuiz,
  myMiniQuizData,
  StudentResults,
} from "../controllers/teacher.controller.js";
import { isTeacher } from "../middlewares/teacherRoleRequired.middleware.js";
import { validateQuestions } from "../middlewares/validateQuestions.middleware.js";

const teacher = express.Router();

teacher.post(
  "/teacher/createQuiz",
  authorise,
  isTeacher,
  validateQuestions,
  createQuiz,
  StudentResults,
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

teacher.get("/teacher/myMiniQuizData", authorise, isTeacher, myMiniQuizData);

teacher.put("/teacher/seeresults", authorise, isTeacher, StudentResults);
export default teacher;
