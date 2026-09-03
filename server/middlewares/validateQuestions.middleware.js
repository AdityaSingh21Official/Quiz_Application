function validateQuestions(req, res, next) {
  try {
    const { quizTitle, quizTime, questions } = req.body;

    if (!quizTime || !quizTitle || !questions) {
      return res.status(422).json({
        message: "Invalid Request data",
      });
    }

    let tempQuizTime = Number(quizTime);

    if (typeof tempQuizTime !== "number" || Number.isNaN(tempQuizTime)) {
      return res.status(422).json({
        message: "Invalid Request data",
      });
    }

    if (questions.length > 25) {
      return res.status(422).json({
        message: "Invalid Request data",
      });
    }

    let correctOptions = 0;

    for (let i = 0; i < questions.length; i += 2) {
      const question = questions[i];
      const options = questions[i + 1];

      if (question.length <= 0) {
        return res.status(422).json({
          message: "Invalid Request data",
        });
      }

      for (const key in options) {
        if (key.length <= 0) {
          return res.status(422).json({
            message: "Invalid Request data",
          });
        }

        if (options[key] === true) {
          correctOptions++;
        }
      }
    }

    if (correctOptions !== questions.length / 2) {
      return res.status(422).json({
        message: "Invalid Request data",
      });
    }

    next();
  } catch (error) {
    console.log("MIDDLEWARE ERROR : validateQuestions.middleware\n" + error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export { validateQuestions };

/* */
