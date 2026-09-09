import { db } from "../database/db.config.js";
import crypto from "crypto";

async function getQuizes(req, res) {
  try {
    const [quizData] = await db.query(`
            select quiz.quiz_id, quiz.quiz_title, quiz.quiz_timelimit , 
            count(question.question_id) as question_count,
            courses.coursename as subject
            from question inner join quiz
            on question.quiz_id = quiz.quiz_id
            inner join courses
            on quiz.aid = courses.aid
            group by quiz_id, coursename
            `);

    const result = [];

    for (let i = 0; i < quizData.length; i++) {
      const temp = {};

      temp.quizId = quizData[i]["quiz_id"];
      temp.quizTitle = quizData[i]["quiz_title"];
      temp.quizTime = quizData[i]["quiz_timelimit"];
      temp.quizQuestions = quizData[i]["question_count"];
      temp.subject = quizData[i]["subject"];

      result.push(temp);
    }

    return res.status(200).json({
      message: "Quizes found",
      data: result,
    });
  } catch (error) {
    console.log("CONTROLLER ERROR : student.controller {getQuizes}\n" + error);

    return res.status(200).json({
      message: "Internal Server Error",
    });
  }
}

async function generateAttempt(req, res) {
  try {
    const userId = req.user.userId;
    const { quizId } = req.body;
    const attemptToken = crypto.randomUUID();

    const [attemptLog] = await db.query(
      `insert into attempts (sid, quiz_id, attempt_token) values(?, ?, ?)`,
      [userId, quizId, attemptToken],
    );

    return res.status(200).json({
      message: "Attempt Generated",
      attemptToken: attemptToken,
    });
  } catch (error) {
    console.log("CONTROLLER ERROR : genrateAttempt.js {startQuiz}\n" + error);

    return res.status(500).json({
      message: "Internal server Error",
    });
  }
}

async function startQuiz(req, res) {
  let thisConn;
  try {
    thisConn = await db.getConnection();

    await thisConn.beginTransaction();

    const userId = req.user.userId;
    const attemptToken = req.params.id;

    if (!attemptToken || attemptToken.length !== 36) {
      return res.status(404).json({
        message: "No quiz attempt found",
      });
    }

    const [metaData] = await thisConn.query(
      `select quiz_id from attempts where attempt_token = ?`,
      [attemptToken],
    );

    const quizId = metaData[0]["quiz_id"];

    const [quizData] = await thisConn.query(
      `
        select quiz_id, quiz_title, quiz_timelimit 
        from quiz 
        where quiz_id = ?;
        `,
      [quizId],
    );

    const [questionsData] = await thisConn.query(
      `
        select question.question_id, question.question_text
        from question inner join quiz 
        on question.quiz_id = quiz.quiz_id
        where question.quiz_id = ?;
        `,
      [quizId],
    );

    const [optionsData] = await thisConn.query(
      `
        select o.oid , o.option_text
        from question_option o inner join question 
        on o.question_id = question.question_id
        inner join quiz 
        on question.quiz_id = quiz.quiz_id
        where quiz.quiz_id = ?
        `,
      [quizId],
    );

    const quizInfo = {
      quidId: quizData[0]["quiz_id"],
      quizTitle: quizData[0]["quiz_title"],
      quizTime: quizData[0]["quiz_timelimit"],
    };

    const result = [];

    for (let i = 0, j = 0; i < questionsData.length; i++) {
      let next = j + 4;
      const temp = {
        questionId: questionsData[i]["question_id"],
        questionText: questionsData[i]["question_text"],
      };

      const options = [];
      while (j < next) {
        options.push({
          optionId: optionsData[j]["oid"],
          optionText: optionsData[j++]["option_text"],
        });
      }

      temp.options = options;
      result.push(temp);
    }

    return res.status(200).json({
      message: `Quiz ${quizId} Ready`,
      primary: quizInfo,
      secondary: result,
    });
  } catch (error) {
    if (thisConn) {
      thisConn.rollback();
    }

    console.log(
      "CONTROLLER ERROR : student.controller.js {startQuiz}\n" + error,
    );

    return res.status(500).json({
      message: "Internal server Error",
    });
  } finally {
    if (thisConn) {
      thisConn.release();
    }
  }
}

async function checkQuiz(req, res) {
  let thisConn;
  try {
    thisConn = await db.getConnection();
    await thisConn.beginTransaction();

    const { data, endTime } = req.body;

    const attemptToken = req.params.id;

    if (!attemptToken || attemptToken.length !== 36) {
      return res.status(404).json({
        message: "No quiz attempt found",
      });
    }

    const [metaData] = await thisConn.query(
      `select quiz_id from attempts where attempt_token = ?`,
      [attemptToken],
    );

    const quizId = metaData[0]["quiz_id"];

    const [checker] = await thisConn.query(
      `
        select q.question_id as qid , o.oid
        from question_option o inner join question q
        on o.question_id = q.question_id
        inner join quiz
        on q.quiz_id = quiz.quiz_id
        where 
        quiz.quiz_id = ? and o.iscorrect = 1;
        `,
      [quizId],
    );

    const totalMarks = checker.length;
    let obtainedMarks = 0;

    for (let i = 0; i < totalMarks; i++) {
      if (data[checker[i]["qid"]] == checker[i]["oid"]) {
        obtainedMarks++;
      }
    }

    await db.query(
      "update attempts set marks = ? , endtime = now(),  completed = 1 where attempt_token = ?",
      [obtainedMarks, attemptToken],
    );

    return res.status(200).json({
      message: "answers loaded",
      marks: obtainedMarks,
    });
  } catch (error) {}
}
export { getQuizes, generateAttempt, startQuiz, checkQuiz };
