import { db } from "../database/db.config.js";

async function myCredentials(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    const [name] = await db.query("select aname from admin where aid = ?", [
      userId,
    ]);

    return res.status(200).json({
      name: name[0]["aname"],
      role: role,
    });
  } catch (error) {
    console.log(
      "CONTROLLER ERROR : teacher.controller {myCredentials}" + error,
    );

    return res.status(200).json({
      message: "Internal Server Error",
    });
  }
}

async function createQuiz(req, res) {
  let thisConn;

  try {
    thisConn = await db.getConnection();
    await thisConn.beginTransaction();

    const { quizTitle, quizTime, questions } = req.body;
    const id = req.user.userId;

    const [quizResponse] = await thisConn.query(
      "insert into quiz(quiz_title, quiz_timelimit, aid) values(?, ? , ?)",
      [quizTitle, quizTime, id],
    );

    const currQuizId = quizResponse.insertId;

    for (let i = 0; i < questions.length; i++) {
      const [questionInsert] = await thisConn.query(
        "insert into question(question_text, quiz_id) values( ? , ? )",
        [questions[i]["question_text"], currQuizId],
      );

      const currQuestionId = questionInsert.insertId;

      const optionsData = questions[i].options.map((opt) => [
        opt.option_text,
        opt.isCorrect,
        currQuestionId,
      ]);

      const [optionsInsert] = await thisConn.query(
        `insert into question_option(option_text, iscorrect, Question_id) values ?`,
        [optionsData],
      );
    }

    let now = new Date();

    await thisConn.query("insert into logs(log_text, log_TD) values(?, ?)", [
      `Quiz ${currQuizId} created by ${id}`,
      now.toLocaleString(),
    ]);

    console.log(`Quiz ${currQuizId} created by ${id}`);

    await thisConn.commit();

    return res.status(200).json({
      message: "Quiz Added Succesfully",
      QuizId: currQuizId,
    });
  } catch (error) {
    if (thisConn) {
      await thisConn.rollback();
    }

    console.log("CONTROLLER ERROR : teacher.controller {createQuiz}" + error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  } finally {
    if (thisConn) {
      thisConn.rollback();
    }
  }
}

async function getMyQuizes(req, res) {
  try {
    const userId = req.user.userId;

    const [quizes] = await db.query("select * from quiz where aid=?", [userId]);

    if (!quizes || quizes.length === 0) {
      return res.status(200).josn({
        message: `No quizes Found for user ${userId}`,
        data: [],
      });
    }

    const [questionCount] = await db.query(
      "select count(q.question_text) as total_per_quiz, quiz.quiz_id from question q inner join quiz on q.quiz_id = quiz.quiz_id inner join admin a on quiz.aid = a.aid where a.aid = ? group by quiz.quiz_id",
      [userId],
    );

    const result = [];

    for (let i = 0; i < quizes.length; i++) {
      let temp = [
        quizes[i]["Quiz_ID"],
        quizes[i]["Quiz_title"],
        questionCount[i]["total_per_quiz"],
        quizes[i]["quiz_timelimit"],
        quizes[i]["date_created"],
      ];

      result.push(temp);
    }

    return res.status(200).json({
      message: `${quizes.length} quizes found for user ${userId}`,
      data: result,
    });
  } catch (error) {
    console.log(
      "CONTROLLER ERROR : teacher.controller {getMyQuizes}\n" + error,
    );

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function deleteQuiz(req, res) {
  let thisConn;

  try {
    thisConn = await db.getConnection();
    await thisConn.beginTransaction();

    const userId = req.user.userId;
    const { quizId, password } = req.body;

    const [getPassword] = await thisConn.query(
      "select apassword from admin where aid = ?",
      [userId],
    );

    if (
      !getPassword ||
      getPassword.length === 0 ||
      password !== getPassword[0]["apassword"]
    ) {
      return res.status(401).json({
        message: "Invalid Password",
      });
    }

    const [quiz] = await thisConn.query(
      "select * from quiz where quiz_id = ?",
      [quizId],
    );

    if (!quiz || quiz.length === 0) {
      return res.status(404).json({
        message: "NO Quiz Found ",
      });
    }

    if (userId != quiz[0]["aid"]) {
      return res.status(403).json({
        message: "Only the Creator or Admin can modify the data",
      });
    }

    const [optionsDel] = await thisConn.query(
      `delete qo from question_option qo inner join question q on q.question_id = qo.question_id inner join quiz on q.quiz_id = quiz.quiz_id where quiz.quiz_id = ?`,
      [quizId],
    );

    const [questionDel] = await thisConn.query(
      `delete q from question q inner join quiz qi on q.quiz_id = qi.quiz_id where qi.quiz_id = ?`,
      [quizId],
    );

    const [quizDel] = await thisConn.query(
      `delete from quiz where quiz_id = ?`,
      [quizId],
    );

    await thisConn.commit();

    return res.status(200).json({
      message: "Quiz Deleted Successfully",
      data: {
        Quiz_Deleted: quizDel.affectedRows,
        Question_Deletd: questionDel.affectedRows,
        Options_Deleted: optionsDel.affectedRows,
      },
    });
  } catch (error) {
    if (thisConn) {
      await thisConn.rollback();
    }

    console.log("CONTROLLER ERROR : teacher.controller {deleteQuiz}\n" + error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  } finally {
    if (thisConn) {
      thisConn.release();
    }
  }
}

async function getThisQuiz(req, res) {
  try {
    const userId = req.user.userId;
    const quizId = req.params.id;

    const [quiz] = await db.query("select * from quiz where quiz_id = ?", [
      quizId,
    ]);

    if (!quiz || quiz.length === 0) {
      return res.status(404).json({
        message: "No quiz found",
        data: [],
      });
    }

    if (userId != quiz[0]["aid"]) {
      return res.status(403).json({
        message: "Only creator or admin can modify the quiz",
        data: [],
      });
    }

    const [quiz_questions] = await db.query(
      "select q.question_id ,q.question_text from question q inner join quiz on q.quiz_id = quiz.quiz_id where quiz.quiz_id = ?",
      [quizId],
    );

    const [question_options] = await db.query(
      "select o.oid ,o.option_text, o.isCorrect from question_option o inner join question q on o.question_id = q.question_id inner join quiz on q.quiz_id = quiz.quiz_id where quiz.quiz_id = ?",
      [quizId],
    );

    /*  --------------------------------------------------Payload Structure--------------------------------
    const result = {
      title: quiz[0]["Quiz_title"],
      timeLimit: quiz[0]["quiz_timelimt"],
      questions: [
        {
          question_id: 1,
          question_text: "text",
          options: [
            {
              optionID: 1,
              optionText: "text",
              isCorrect: false,
            },
          ],
        },
      ],
    };
    -----------------------------------------------------------------------------------------------------------
    */

    const result = {
      quiz_id: quizId,
      title: quiz[0]["Quiz_title"],
      timeLimit: quiz[0]["quiz_timelimit"],
      questions: [],
    };

    for (let i = 0, j = 0; i < quiz_questions.length; i++) {
      const thisQuestion = {
        question_id: quiz_questions[i]["question_id"],
        question_text: quiz_questions[i]["question_text"],
        options: [],
      };

      const next = j + 4;

      while (j < next) {
        const thisOptions = {
          option_id: question_options[j]["oid"],
          option_text: question_options[j]["option_text"],
          isCorrect: question_options[j]["isCorrect"],
        };

        j++;
        thisQuestion.options.push(thisOptions);
      }

      result.questions.push(thisQuestion);
    }

    return res.status(200).json({
      message: `Quiz ${quizId} fetched`,
      data: result,
    });
  } catch (error) {
    console.log(
      "CONTROLLER ERROR : teacher.controller {getThisQuiz}\n" + error,
    );

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function updateQuiz(req, res) {
  let thisConn;

  try {
    thisConn = await db.getConnection();

    await thisConn.beginTransaction();

    const userId = req.user.userId;
    const { quizId, quizTitle, quizTime, questions } = req.body;

    if (!quizId || quizId.length === 0) {
      return res.status(404).json({
        message: "No quiz Avaliable",
      });
    }

    const [oldQuiz] = await thisConn.query(
      "select aid from quiz where quiz_id = ?",
      [quizId],
    );

    if (!oldQuiz || oldQuiz.length === 0) {
      return res.status(404).json({
        message: "No quiz found",
      });
    }

    if (userId != oldQuiz[0]["aid"]) {
      return res.status(403).json({
        message: "Only the creator or admin can change the quiz",
      });
    }

    const [optionsDel] = await thisConn.query(
      `delete qo from question_option qo inner join question q on q.question_id = qo.question_id inner join quiz on q.quiz_id = quiz.quiz_id where quiz.quiz_id = ?`,
      [quizId],
    );

    const [questionDel] = await thisConn.query(
      `delete q from question q inner join quiz qi on q.quiz_id = qi.quiz_id where qi.quiz_id = ?`,
      [quizId],
    );

    const [quizUpdate] = await thisConn.query(
      "update quiz set quiz_title = ? , quiz_timelimit = ? where quiz_id = ?",
      [quizTitle, quizTime, quizId],
    );

    for (let i = 0; i < questions.length; i++) {
      const [questionInsert] = await thisConn.query(
        "insert into question(question_text, quiz_id) values( ? , ? )",
        [questions[i]["question_text"], quizId],
      );

      const currQuestionId = questionInsert.insertId;

      const optionsData = questions[i].options.map((opt) => [
        opt.option_text,
        opt.isCorrect,
        currQuestionId,
      ]);

      const [optionsInsert] = await thisConn.query(
        `insert into question_option(option_text, iscorrect, Question_id) values ?`,
        [optionsData],
      );
    }

    let now = new Date();

    await thisConn.query("insert into logs(log_text, log_TD) values(?, ?)", [
      `Quiz ${quizId} updated by ${userId}`,
      now.toLocaleString(),
    ]);

    console.log(`Quiz ${quizId} updated by ${userId}`);

    await thisConn.commit();

    return res.status(200).json({
      message: "Quiz updated Succesfully",
    });
  } catch (error) {
    if (thisConn) {
      await thisConn.rollback();
    }
    console.log("CONTROLLER ERROR : teacher.controller {updateQuiz}\n" + error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  } finally {
    if (thisConn) {
      thisConn.release();
    }
  }
}

export {
  myCredentials,
  createQuiz,
  getMyQuizes,
  deleteQuiz,
  getThisQuiz,
  updateQuiz,
};
