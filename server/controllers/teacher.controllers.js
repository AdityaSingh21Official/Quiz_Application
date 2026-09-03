import { db } from "../database/db.config.js";

async function createQuiz(req, res) {
  try {
    const { quizTitle, quizTime, questions } = req.body;
    const id = req.user.userId;

    const [quizResponse] = await db.query(
      "insert into quiz(quiz_title, quiz_timelimit, aid) values(?, ? , ?)",
      [quizTitle, quizTime, id],
    );

    const currQuizId = quizResponse.insertId;

    for (let i = 0; i < questions.length; i += 2) {
      let question_text = questions[i];
      let options = questions[i + 1];

      const [questionResponse] = await db.query(
        "insert into question(question_text, quiz_id) values(?, ?)",
        [question_text, currQuizId],
      );

      let currQuestionId = questionResponse.insertId;

      for (const key in options) {
        const [optionResponse] = await db.query(
          "insert into question_option(option_text, isCorrect, question_id) values(? , ? ,?)",
          [key, Number(options[key]), currQuestionId],
        );
      }
    }

    let now = new Date();

    await db.query("insert into logs(log_text, log_TD) values(?, ?)", [
      `Quiz ${currQuizId} created by ${id}`,
      now.toLocaleString(),
    ]);

    console.log(`Quiz ${currQuizId} created by ${id}`);

    return res.status(200).json({
      message: "Quiz Added Succesfully",
      QuizId: currQuizId,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export { createQuiz };
