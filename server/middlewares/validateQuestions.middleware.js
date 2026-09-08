const payload = {
  quizTitle: "title",
  quizTime: "time",
  questions: [
    {
      question_text: "question _ text ",
      options: [
        {
          option_text: "option 1 text",
          isCorrect: true,
        },
        {
          option_text: "option 2 text ",
          isCorrect: false,
        },
      ],
    },
  ],
};

function validateQuestions(req, res, next) {
  try {
    const { quizTitle, quizTime, questions } = req.body;

    if (!quizTime || !quizTitle || !questions || !Array.isArray(questions)) {
      return res.status(422).json({
        message: "Invalid Request data",
      });
    }

    let tempQuizTime = Number(quizTime);

    if (typeof tempQuizTime !== "number" || Number.isNaN(tempQuizTime)) {
      return res.status(422).json({
        message: "Invalid Quiz Time",
      });
    }

    if (tempQuizTime <= 0) {
      return res.status(422).json({
        message: "Invalid Quiz Time",
      });
    }

    if (questions.length === 0) {
      return res.status(422).json({
        message: "Atleast 1 question Required",
      });
    }

    if (questions.length > 100) {
      return res.status(422).json({
        message: "Maximum of 100 Questions Allowed Per Quiz",
      });
    }

    for (let i = 0; i < questions.length; i++) {
      if (
        typeof questions[i].question_text !== "string" ||
        questions[i]["question_text"].length < 3
      ) {
        return res.status(422).json({
          message: "Invalid Question",
          data: questions[i]["question_text"],
        });
      }

      if (
        !questions[i].options ||
        !Array.isArray(questions[i].options) ||
        questions[i].options.length !== 4
      ) {
        return res.status(422).json({
          message: "Require 4 Options per question",
          data: questions[i].options,
        });
      }

      let correctCount = 0;
      for (let j = 0; j < 4; j++) {
        if (
          typeof questions[i].options[j] !== "object" ||
          questions[i].options[j].isCorrect === undefined
        ) {
          return res.status(422).json({
            message: "Invalid Data",
          });
        }

        if (
          questions[i].options[j].option_text === undefined ||
          questions[i].options[j].option_text.length < 3
        ) {
          return res.status(422).json({
            message: "Invalid Option",
            data: questions[i].options[j],
          });
        }
        if (questions[i].options[j].isCorrect == true) {
          correctCount++;
        }
      }

      if (correctCount > 1) {
        return res.status(422).json({
          message: "Only 1 Correct option per Question",
        });
      } else if (correctCount < 1) {
        return res.status(422).json({
          message: "1 Correct option per Question",
        });
      }
    }

    next();
  } catch (error) {
    console.log("MIDDLEWARE ERROR : validateQuestions.middleware\n" + error);

    res.status(500).json({
      message: "Invalid Data Structure",
    });
  }
}

export { validateQuestions };

/* */
