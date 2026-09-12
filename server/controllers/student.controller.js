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

    await db.query(
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
      `select quiz_id, completed from attempts where attempt_token = ?`,
      [attemptToken],
    );

    if (!metaData || metaData.length === 0) {
      return res.status(400).json({
        message: "Invalid attempt",
      });
    }

    if (metaData[0]["completed"] == 1) {
      return res.status(400).json({
        message: "Invalid attempt",
      });
    }

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

    thisConn.commit();

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

    const { data } = req.body;

    const attemptToken = req.params.id;

    if (!attemptToken || attemptToken.length !== 36) {
      return res.status(404).json({
        message: "No quiz attempt found",
      });
    }

    const [metaData] = await thisConn.query(
      `select quiz_id, attemptid, completed from attempts where attempt_token = ?`,
      [attemptToken],
    );

    if (!metaData || metaData.length === 0) {
      return res.status(400).json({
        message: "Invalid Attempt",
      });
    }

    if (metaData[0]["completed"] == 1) {
      return res.status(400).json({
        message: "Invalid Attempt",
      });
    }

    const quizId = metaData[0]["quiz_id"];
    const attemptId = metaData[0]["attemptid"];

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
    const insertArray = [];

    for (let i = 0; i < totalMarks; i++) {
      if (data[checker[i]["qid"]] == checker[i]["oid"]) {
        obtainedMarks++;
      }

      const temp = [
        Number(attemptId),
        Number(checker[i]["qid"]),
        Number(data[checker[i]["qid"]]),
      ];
      insertArray.push(temp);
    }

    await thisConn.query(`insert into response values ?`, [insertArray]);

    await thisConn.query(
      "update attempts set marks = ? , endtime = now(),  completed = 1 where attempt_token = ?",
      [obtainedMarks, attemptToken],
    );

    thisConn.commit();

    return res.status(200).json({
      message: "answers loaded",
      marks: obtainedMarks,
    });
  } catch (error) {
    if (thisConn) {
      thisConn.rollback();
    }

    console.log(
      "CONTROLLER ERROR : student.controller.js {checkQuiz}\n" + error,
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

async function myAllResults(req, res) {
  try {
    const userId = req.user.userId;

    const [allResultsData] = await db.query(
      `
      select q.quiz_id , q.quiz_title , a.attempt_token, a.marks, a.attempt_date 
      from quiz q inner join attempts a 
      on q.quiz_id = a.quiz_id
      where a.sid = ? and a.completed = 1;
      `,
      [userId],
    );

    if (!allResultsData || allResultsData.length === 0) {
      return res.status(404).json({
        message: "No quiz attempted by user",
      });
    }

    const [questionDetails] = await db.query(
      `
        select q.quiz_id, count(*) as total 
        from question q inner join 
        (select distinct quiz_id from attempts where sid = ?) a 
        on q.quiz_id = a.quiz_id 
        group by q.quiz_id;
        `,
      [userId],
    );

    const questionManifest = {};

    for (let i = 0; i < questionDetails.length; i++) {
      questionManifest[questionDetails[i]["quiz_id"]] =
        questionDetails[i]["total"];
    }

    /* --------------------------------------Payload--------------------
    const result = [
      {
        quizTitle: "bogous",
        attmptid: 1,
        score: 10,
        percentage: 100,
        status: "passed",
        date: "aa-bb-cccc",
      },
      {
            "quizTitle": "ok so this is another test 2",
            "attmptId": 118,
            "score": 1,
            "total": 2,
            "percentage": 50,
            "passeed": true,
            "date": "2026-09-10T18:30:00.000Z"
      }
    ];

    const metaData = {
      quizTaken: 1,
      aveScore: 78,
      bestScore: 45,
    }; 
    --------------------------------------------Payload---------------------------------
    */

    const result = [];
    let totalPercentage = 0;
    let bestScore = 0;

    for (let i = 0; i < allResultsData.length; i++) {
      let percentage =
        (allResultsData[i]["marks"] /
          questionManifest[allResultsData[i]["quiz_id"]]) *
        100;

      totalPercentage += percentage;

      if (percentage >= bestScore) {
        bestScore = percentage;
      }

      const temp = {
        quizTitle: allResultsData[i]["quiz_title"],
        attmptId: allResultsData[i]["attempt_token"],
        score: allResultsData[i]["marks"],
        total: questionManifest[allResultsData[i]["quiz_id"]],
        percentage: percentage,
        passeed: percentage > 35.0,
        date: allResultsData[i]["attempt_date"],
      };

      result.push(temp);
    }

    const avgScore = totalPercentage / allResultsData.length;

    const metaData = {
      totalQuizTaken: allResultsData.length,
      avgScore: avgScore.toFixed(2),
      bestScore: bestScore,
    };

    return res.status(200).json({
      message: "Data fetched succesfully",
      metaData: metaData,
      results: result,
    });
  } catch (error) {
    console.log(
      "CONTROLLER ERROR : student.controller.js {myAllResults}\n" + error,
    );

    return res.status(500).json({
      message: "Internal server Error",
    });
  }
}

async function getThisQuizResult(req, res) {
  try {
    const { attemptToken } = req.body;
    const [allData] = await db.query(
      `
      select q.question_id as questionId , q.question_text questionText,
      o.oid as correctId, o.option_text as correctText,
      r.selected as selectedId , so.option_text as selectedText
      from response r inner join question q on r.question_id = q.question_id
      inner join question_option o on q.question_id = o.question_id and o.iscorrect = 1
      left join question_option so on r.selected = so.oid 
      where r.attemptId in 
      (select attemptId from attempts where attempt_token = ?)
      `,
      [attemptToken],
    );

    if (!allData || allData.length === 0) {
      return res.status(404).json({
        message: "Invalid attempt id",
      });
    }

    return res.status(200).json({
      message: "Response Fetched",
      data: allData,
    });
  } catch (error) {
    console.log(
      "CONTROLLER ERROR : student.controller.js {getThisQuizResult}\n" + error,
    );

    return res.status(500).json({
      message: "Internal server Error",
    });
  }
}
export {
  getQuizes,
  generateAttempt,
  startQuiz,
  checkQuiz,
  myAllResults,
  getThisQuizResult,
};
