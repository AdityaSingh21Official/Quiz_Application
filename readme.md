# EvaQuiz

A proctored online quiz platform. Teachers build quizzes and enroll students with a reference photo. Students take timed quizzes **exclusively through a locked-down desktop application**, while a Python service verifies their identity and watches for cheating through the webcam.

Author: Aditya Singh

---

## Table of Contents

1. [Key Design Rule: Desktop-Only Quiz Attempts](#key-design-rule-desktop-only-quiz-attempts)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [End-to-End Workflow](#end-to-end-workflow)
5. [Technology Stack](#technology-stack)
6. [Project Structure](#project-structure)
7. [API Reference](#api-reference)
8. [Database](#database)
9. [Installation and Setup](#installation-and-setup)
10. [Known Issues and Recommended Improvements](#known-issues-and-recommended-improvements)
11. [Roadmap](#roadmap)

---

## Key Design Rule: Desktop-Only Quiz Attempts

A student can **only attempt a quiz from the EvaQuiz desktop application**. Opening the quiz URL in Chrome, Firefox, or any other browser does not work.

This is enforced on the server, not just in the UI:

- The Electron app attaches two headers to every request it sends: `X-Quiz-Ts` (timestamp) and `X-Quiz-Sig` (an HMAC-SHA256 of `timestamp.METHOD.path`, signed with a shared secret).
- The middleware `requireDesktopClient` verifies the signature with a constant-time comparison and rejects requests whose timestamp is more than 5 minutes off.
- It is applied to the three endpoints that make up an attempt: `generateAttempt`, `startQuiz`, and `submitQuiz`.
- A browser cannot produce a valid signature, so it receives `403 Please use the Quiz Desktop app to take quizzes`.

A student can still log in from a normal browser to view results and history. Only starting, taking, and submitting a quiz is restricted.

Enforcement is controlled by the environment variable `REQUIRE_DESKTOP`. It must be set to `true` for the check to run; otherwise the middleware lets every request through (useful during development).

The desktop app also turns the quiz window into a kiosk: full screen, always on top, screen-capture protection enabled, navigation to any other site blocked, and refresh, close, print, save, view-source, and DevTools shortcuts disabled.

---

## Features

### Teacher (Faculty)

- JWT login with 2-hour sessions
- Create, edit, view, and delete quizzes (deleting requires re-entering the password)
- Server-side validation: 1 to 100 questions per quiz, exactly 4 options per question, exactly 1 correct option
- Register students by uploading a face photo; a face embedding is generated and stored
- Results view per quiz: students enrolled versus attempted, average marks, each student's best score and time taken
- Ownership checks: only the quiz creator can view, edit, or delete a quiz

### Student

- JWT login
- Browse available quizzes with title, subject, question count, and time limit
- Take quizzes through the desktop application only
- Automatic scoring on submission
- Result history with average and best percentage, and a per-question review showing the selected answer against the correct one

### Proctoring

| Check                  | Behaviour                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity verification  | Webcam frames are sent about five times per second and compared to the registered face (ArcFace through DeepFace, cosine distance below 0.68) |
| Anti-spoofing          | Rejects printed photos and screens shown to the camera                                                                                        |
| Face count             | No face or more than one face counts as a failed check                                                                                        |
| Liveness               | A face that stays unnaturally still across a 20-frame window fails                                                                            |
| Object detection       | YOLO11 flags a mobile phone, book, or laptop in frame                                                                                         |
| Fullscreen enforcement | Leaving fullscreen or moving the mouse out of the window starts a 10-second countdown, then the quiz is force-submitted                       |
| Sustained failures     | Five consecutive failed face checks start the same 10-second warning                                                                          |
| Camera loss            | A disconnected or disabled camera is treated as a failed check                                                                                |

---

## System Architecture

The system consists of three cooperating services plus the database.

```
+---------------------------+          +-------------------------------+
|  quiz-desktop/            |  loads   |  public/                      |
|  Electron kiosk client    |--------->|  Web frontend (HTML/CSS/JS)   |
|  signs every request      |          +---------------+---------------+
+---------------------------+                          |
                                                       | fetch /api/*
                                                       v
                                      +-----------------------------------+
                                      |  server/  (Node.js + Express)     |
                                      |  routes -> middleware -> controller|
                                      +-----------+-----------------+-----+
                                                  |                 |
                                         mysql2   |                 | HTTP 127.0.0.1:8000
                                                  v                 v
                                            +-----------+   +--------------------------+
                                            |   MySQL   |   | python_FR_service/       |
                                            +-----------+   | FastAPI + DeepFace + YOLO|
                                                            +--------------------------+
```

Request lifecycle: `Frontend -> Route -> Middleware (JWT, role, desktop signature, upload handling) -> Controller -> MySQL -> JSON response`.

---

## End-to-End Workflow

### 1. Student enrollment

1. A teacher opens the registration page and uploads a photo for a 5-digit student ID.
2. `POST /api/teacher/registerStudent` stores the image with multer (JPG, PNG, or WEBP, up to 2 MB, random UUID filename).
3. The server calls the Python service at `/embed`, which requires exactly one detectable face and returns a 512-dimension ArcFace embedding.
4. The embedding is saved to `face_embeding` and the filename to `student.photo_path`. A previous photo for the same student is deleted.

### 2. Authentication

Login endpoints verify the ID and password, sign a JWT containing `userId` and `role` (valid for 2 hours), and write a row to `logs`. The browser keeps the token in `localStorage`. Each protected page runs `auth.check.js`, which validates the token through `GET /api/postLogin/authorize` and redirects to an error page on failure. Inside the desktop app, the preload script injects the token into the quiz window.

### 3. Quiz creation

`POST /api/teacher/createQuiz` passes through `authorise`, `isTeacher`, and `validateQuestions`. The quiz, its questions, and its options are then written in a single database transaction that rolls back on any error.

### 4. Starting an attempt (desktop only)

1. The student selects a quiz and accepts the instructions.
2. `POST /api/student/generateAttempt` confirms that the student has a registered face and that the Python service is reachable, then inserts an `attempts` row with a random UUID `attempt_token`.
3. The dashboard opens `quiz-attempt.html?attempt=<token>`. The Electron app intercepts this URL and opens it in the kiosk window.

### 5. Taking the quiz

1. `GET /api/student/startQuiz/:token` returns the questions and options. Correct answers are never sent to the client.
2. The page enters fullscreen, starts the countdown timer, and begins the face monitor.
3. Each captured frame (480 px wide JPEG, at most 200 KB) is posted to `POST /api/student/verifyFace/:token`. The server loads the stored embedding and forwards the frame to the Python service, which runs these checks in order: anti-spoofing, face count, identity match, motion/liveness, object detection.
4. Violations start a 10-second warning. If the student does not recover in time, the quiz is submitted automatically.

### 6. Submission and results

`POST /api/student/submitQuiz/:token` scores the answers against the correct options, stores one `response` row per question, and sets `marks`, `endtime`, and `completed = 1` inside a transaction. It also tells the Python service to discard that attempt's tracking state. An attempt that is already completed is rejected, so a token cannot be reused.

Students then see their history (`/myResults`) and a per-question review (`/thisResponse`). Teachers see class results through `/seeresults`. The current pass mark is above 35 percent.

---

## Technology Stack

| Area               | Technology                                                            |
| ------------------ | --------------------------------------------------------------------- |
| Frontend           | HTML5, CSS3, vanilla JavaScript                                       |
| Backend            | Node.js, Express 5 (ES modules), jsonwebtoken, multer, mysql2, dotenv |
| Database           | MySQL 8                                                               |
| Desktop client     | Electron, electron-builder (NSIS installer for Windows)               |
| Proctoring service | Python, FastAPI, DeepFace (ArcFace), Ultralytics YOLO11, NumPy        |

---

## Project Structure

```
Quiz_Application/
|-- DataBaseERD/
|   `-- ERD.png                        Entity relationship diagram
|-- schema.sql                         MySQL schema
|-- public/                            Web frontend
|   |-- index.html                     Login page
|   |-- teacher-dashboard.html         Quiz management
|   |-- teacher-results.html           Per-quiz results
|   |-- student-registration.html      Student photo enrollment
|   |-- student-dashboard.html         Quiz list
|   |-- quiz-attempt.html              Proctored quiz page
|   |-- student-result.html            History and review
|   |-- auth.check.js                  Token validation
|   `-- *.error.html                   Error pages
|-- server/
|   |-- server.js                      Express entry point
|   |-- routes/                        login, teacher, student
|   |-- controllers/                   login, teacher, student, image, temp.frame
|   |-- middlewares/                   auth, roles, validation, uploads, desktop signature
|   `-- database/db.config.js          MySQL connection pool
|-- python_FR_service/
|   |-- main.py                        FastAPI: /embed /verify /complete /ping
|   `-- yolo11n.pt, yolo11s.pt         YOLO weights
`-- quiz-desktop/                      Electron kiosk application
    |-- main.js, preload.js
    |-- offline.html, style.css
    `-- build/icon.ico
```

---

## API Reference

All routes are mounted under `/api`. "Desktop" means the request must carry a valid desktop signature when `REQUIRE_DESKTOP=true`.

### Authentication

| Method | Endpoint               | Access             | Description                 |
| ------ | ---------------------- | ------------------ | --------------------------- |
| POST   | `/login/faculty`       | Public             | Teacher login, returns JWT  |
| POST   | `/login/student`       | Public             | Student login, returns JWT  |
| GET    | `/postLogin/authorize` | Any logged-in user | Validates the current token |

### Teacher

| Method | Endpoint                   | Description                                         |
| ------ | -------------------------- | --------------------------------------------------- |
| POST   | `/teacher/createQuiz`      | Create a quiz with questions and options            |
| GET    | `/teacher/myQuizes`        | List the teacher's quizzes                          |
| GET    | `/teacher/getquiz/:id`     | Fetch a quiz for editing (owner only)               |
| PUT    | `/teacher/updatequiz`      | Replace a quiz's content (owner only)               |
| DELETE | `/teacher/deleteQuiz`      | Delete a quiz, requires password (owner only)       |
| GET    | `/teacher/myMiniQuizData`  | Quiz IDs and titles for selectors                   |
| PUT    | `/teacher/seeresults`      | Results for a given quiz                            |
| POST   | `/teacher/registerStudent` | Upload a student photo and store the face embedding |

### Student

| Method | Endpoint                            | Desktop | Description                            |
| ------ | ----------------------------------- | ------- | -------------------------------------- |
| GET    | `/student/getQuizes`                | No      | Available quizzes                      |
| POST   | `/student/generateAttempt`          | Yes     | Create an attempt token                |
| GET    | `/student/startQuiz/:id`            | Yes     | Retrieve questions for an attempt      |
| POST   | `/student/verifyFace/:attemptToken` | No      | Submit a webcam frame for verification |
| POST   | `/student/submitQuiz/:id`           | Yes     | Submit answers and receive the score   |
| GET    | `/student/myResults`                | No      | Result history and statistics          |
| PUT    | `/student/thisResponse`             | No      | Per-question review of an attempt      |
| GET    | `/student/getPhoto`                 | No      | Registered photo filename              |

### Python proctoring service (internal, port 8000)

| Method | Endpoint    | Description                                   |
| ------ | ----------- | --------------------------------------------- |
| POST   | `/embed`    | Generate a face embedding from a stored photo |
| POST   | `/verify`   | Run all proctoring checks on one frame        |
| POST   | `/complete` | Clear tracking state for a finished attempt   |
| GET    | `/ping`     | Health check                                  |

---

## Database

Engine: MySQL 8, InnoDB, utf8mb4. The full schema is in [`schema.sql`](schema.sql) and the ER diagram is in [`DataBaseERD/ERD.png`](DataBaseERD/ERD.png).

| Table             | Purpose                                                                               |
| ----------------- | ------------------------------------------------------------------------------------- |
| `admin`           | Teacher accounts (`aid`, `aname`, `apassword`)                                        |
| `student`         | Student accounts and photo filename (`sid`, `sname`, `spassword`, `photo_path`)       |
| `courses`         | Course or subject name per teacher                                                    |
| `quiz`            | Quiz title, time limit in minutes, owning teacher, creation date                      |
| `question`        | Question text belonging to a quiz                                                     |
| `question_option` | Four options per question with an `iscorrect` flag                                    |
| `attempts`        | One row per attempt: student, quiz, token, start and end time, marks, completion flag |
| `response`        | The option a student selected for each question in an attempt                         |
| `face_embeding`   | 512-value face embedding per student, stored as JSON                                  |
| `logs`            | Audit trail of logins and quiz creation or updates                                    |

Relationships: an admin creates many quizzes; a quiz has many questions; a question has many options; a student has many attempts; an attempt has many responses.

---

## Installation and Setup

### Prerequisites

- Node.js 18 or later and npm
- MySQL 8
- Python 3.10 to 3.12 (a version supported by DeepFace and Ultralytics)
- A webcam on the student machine
- Windows to build the desktop installer

### 1. Clone and install

```bash
git clone https://github.com/AdityaSingh21Official/Quiz_Application.git
cd Quiz_Application
npm install
cd server && npm install && cd ..
```

### 2. Create the database

```bash
mysql -u root -p -e "CREATE DATABASE quizApplication;"
mysql -u root -p quizApplication < schema.sql
```

`schema.sql` creates the tables only. Add at least one teacher and one student before logging in:

```sql
INSERT INTO admin (aid, aname, apassword) VALUES (1001, 'Demo Teacher', 'changeme');
INSERT INTO courses (courseId, courseName, aid) VALUES (1, 'Computer Science', 1001);
INSERT INTO student (sid, sname, spassword) VALUES (10001, 'Demo Student', 'changeme');
```

A student ID must be exactly 5 digits to pass photo registration. Passwords are currently stored as plain text (see Known Issues).

### 3. Configure the server

Create `server/.env`:

```env
PORT=11011

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=quizApplication

JWT_SECRET=replace_with_a_long_random_string

REQUIRE_DESKTOP=true
DESKTOP_APP_KEY=replace_with_a_long_random_hex_string
```

`DESKTOP_APP_KEY` must be identical to the key used by the Electron app. The desktop app loads `http://localhost:11011`, so keep `PORT=11011` or change the `SERVER` constant in `quiz-desktop/main.js`.

### 4. Start the proctoring service

```bash
cd python_FR_service
pip install fastapi uvicorn deepface ultralytics numpy
```

Edit `BASE_DIR` in `main.py` so it points to `server/uploads/students` on your machine, then run:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```

The first start downloads the ArcFace and anti-spoofing models and may take a few minutes.

### 5. Start the Node server

```bash
cd server
mkdir -p uploads/students
npx nodemon server.js
```

### 6. Run or build the desktop app

```bash
cd quiz-desktop
npm install
npm start          # development
npm run dist       # builds the Windows installer
```

Teachers can use any browser at `http://localhost:11011`. Students must use the desktop app to take quizzes.

---

## Known Issues and Recommended Improvements

### Security

1. **Desktop signing key is committed to the repository.** `APP_KEY` in `quiz-desktop/main.js` is public, so anyone can forge a valid signature and bypass the desktop-only rule. Rotate the key, treat the old one as compromised, and inject the new one at build time. Note that any key shipped inside a client application can eventually be extracted, so this is a deterrent rather than absolute protection.
2. **Plain-text passwords.** Login compares the submitted password directly with the stored value. Hash with bcrypt or argon2. Note that `admin.apassword` is `varchar(50)`, which is too short for a bcrypt hash (60 characters); widen it first.
3. **JWT secret and credentials** must only live in `.env`, which is already gitignored.

### Database

4. **Deleting or editing a quiz that has attempts fails.** `deleteQuiz` and `updateQuiz` remove questions and options, but `attempts` and `response` reference them without `ON DELETE CASCADE`, so MySQL rejects the delete and the transaction rolls back. Add cascading foreign keys or switch to soft deletion (an `is_active` flag). Also note that `updateQuiz` regenerates question IDs, which would orphan existing result history.
5. **`attempts.startTime` and `endtime` are `TIME` columns.** The results query subtracts them directly, which gives wrong values and breaks across midnight. Use `DATETIME` with `TIMESTAMPDIFF`.
6. **`attempts.sid`, `attempts.quiz_id`, and `attempts.completed` are nullable.** Make them `NOT NULL`, with `completed` defaulting to `0`.
7. **`response.selected` is `NOT NULL`.** An unanswered question cannot be stored as null. Allow null, and handle unanswered questions explicitly during submission.
8. **`logs.log_TD` is a `varchar` holding a locale string.** A `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` column is more reliable.
9. **`schema.sql` is a raw `mysqldump`.** It contains `DROP TABLE IF EXISTS` (re-importing wipes data) and fixed `AUTO_INCREMENT` counters. Regenerate it with `mysqldump --no-data --skip-add-drop-table` and remove the counters before committing.

### Application logic

10. **Quiz visibility.** Every student sees every quiz, and `getQuizes` inner-joins `courses` on the teacher ID, so a teacher with no course (or several) produces missing or duplicated quizzes. Link quizzes to courses explicitly and add student-course enrollment.
11. **Teacher results are not scoped.** `StudentResults` accepts any `quizId` without checking that the requesting teacher owns it.
12. **Option grouping.** Several controllers assume rows arrive in order, four per question. Add `ORDER BY` or group by `question_id`.
13. **Python service path.** `BASE_DIR` is hard-coded to a local Windows path; read it from an environment variable.
14. **Repository hygiene.** The root `node_modules/` is committed and dependencies are split between two `package.json` files. Remove `node_modules` from git (`git rm -r --cached node_modules`) and consolidate dependencies in `server/package.json`.
15. **Typos in response keys** (`messgae`, `passeed`, `quidId`). Fix them together with the frontend code that reads them.

---

## Roadmap

- Cascading deletes or soft deletion for quizzes
- Password hashing and login rate limiting
- Course enrollment so students only see their own quizzes
- Violation log so teachers can review what triggered each warning
- `requirements.txt` for the Python service and Docker Compose for the full stack
- Automated tests and OpenAPI documentation
- HTTPS and production deployment

---

## Author

Aditya Singh - [github.com/AdityaSingh21Official](https://github.com/AdityaSingh21Official)

⭐ If this project helped you, consider starring it!
