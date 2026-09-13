# Quiz Application

> **Status:** Core functionality complete — hardening and polish in progress.

A full-stack quiz application built from scratch using Node.js, Express, MySQL, and vanilla HTML/CSS/JavaScript — no frontend framework, no backend boilerplate/starter kit.

The project was built as a hands-on exercise in designing a real-world full-stack system end to end: authentication, REST APIs, relational database design, backend architecture, and frontend-backend integration, without following a tutorial.

## Overview

The app is built around two roles sharing a single login flow:

- **Teacher** — creates quizzes (title, time limit), adds questions with up to 4 answer options each, and reviews per-student results and completion status for any quiz they've created.
- **Student** — sees a dashboard of available quizzes, starts a timed attempt, and gets auto-submitted the moment the clock runs out — or can submit manually before then. Past attempts can be reviewed answer-by-answer against the correct option.

## Features

- **JWT-based authentication** with a single login form; role (teacher/student) is resolved server-side and encoded into the token.
- **Role-gated REST API** — every teacher/student route is protected by dedicated middleware (`isTeacher`, `isStudentRole`) that checks the decoded token, not just the UI.
- **Quiz builder** — teachers can add any number of questions, each with 2–4 options and exactly one marked correct; request-body validation middleware rejects malformed payloads before they touch the database.
- **Transactional writes** — quiz creation, quiz updates, and quiz deletion each run inside a MySQL transaction, so a partial failure can't leave a quiz with orphaned questions or options.
- **Timed attempts with anti-cheat handling** — a live countdown ring, warning toasts as time runs low, automatic submission when time expires, and automatic submission if the student switches tabs/loses focus for too long or closes the window mid-attempt.
- **Result review** — students can revisit a completed attempt and see each question alongside their selected answer and the correct one; teachers get a per-quiz table of every student's status (not attempted / attempted / auto-submitted) and score.
- **Audit logging** — logins and quiz-creation events are recorded to a `logs` table.

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript (no frameworks)

### Backend

- Node.js
- Express.js (v5)
- REST APIs
- JSON Web Tokens (JWT)

### Database

- MySQL
- mysql2 (promise pool + transactions)

### Development Tools

- Git / GitHub
- npm
- nodemon

## Architecture

```
              Client
                |
                | HTTP Requests
                v
        +----------------+
        |    Express     |
        |     Server     |
        +-------+--------+
                |
   +------------+------------+
   |            |            |
   v            v            v
Routes      Middleware   Controllers
   |            |            |
   +------------+------------+
                |
                v
         Database Layer
                |
                v
             MySQL
```

Routing, authentication/authorization, request validation, and database access are kept in separate layers (`routes/`, `middlewares/`, `controllers/`, `database/`).

## Authentication

```
User
 |
 | Login Credentials
 v
Authentication API
 |
 | Validate Credentials
 v
Database
 |
 | User Verified
 v
JWT (role embedded in payload)
 |
 | Authenticated Request (Bearer token)
 v
Authorization Middleware
 |
 +---- Valid Token + Correct Role ----> Protected Route
 |
 +---- Invalid/Expired Token/Role -----> Request Rejected (401/403)
```

## Quiz Flow

**Teacher**

```
Login → Teacher Dashboard → Create Quiz
                                 |
                                 +-- Title & time limit
                                 +-- Questions (2-4 options each, 1 correct)
                                 v
                              Quiz Saved
                                 |
                                 v
                    View Results (per student, per quiz)
```

**Student**

```
Login → Student Dashboard → Select Quiz → Start Attempt
                                              |
                                              v
                                   Countdown begins
                                              |
                        Manual Submit  <------+------>  Time Expires
                                |                              |
                                +--------------+---------------+
                                               v
                                        Attempt Graded
                                               |
                                               v
                                    View Result / Review Answers
```

## Project Structure

```
Quiz_Application/
|
├── public/
|   ├── index.html               (login)
|   ├── teacher-dashboard.html
|   ├── teacher-results.html
|   ├── student-dashboard.html
|   ├── quiz-attempt.html
|   ├── student-result.html
|   ├── auth.check.js            (verifies token on protected pages)
|   ├── style.css
|   └── assets/
|
├── server/
|   ├── controllers/
|   |   ├── login.authenticate.controller.js
|   |   ├── teacher.controller.js
|   |   └── student.controller.js
|   ├── middlewares/
|   |   ├── authorization.middleware.js
|   |   ├── teacherRoleRequired.middleware.js
|   |   ├── isStudentRole.middleware.js
|   |   └── validateQuestions.middleware.js
|   ├── routes/
|   |   ├── login.routes.js
|   |   ├── teacherRoutes.js
|   |   └── studentRoutes.js
|   ├── database/
|   |   └── db.config.js
|   ├── package.json
|   └── server.js
|
├── DataBaseERD/
|   └── ERD.png
|
├── package.json
├── package-lock.json
└── readme.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- MySQL
- Git

### Clone the Repository

```
git clone https://github.com/AdityaSingh21Official/Quiz_Application.git
cd Quiz_Application
```

### Install Dependencies

Dependencies are currently split between the project root and `/server`, so install both:

```
npm install
cd server
npm install
```

### Database Setup

Create a MySQL database and the required tables (`admin`, `student`, `quiz`, `question`, `question_option`, `attempts`, `response`, `logs`) matching the schema in `DataBaseERD/ERD.png` before starting the server.

### Environment Configuration

Create a `.env` file inside `/server` (never commit this file):

```
PORT=1024

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=quiz_application

JWT_SECRET=your_long_random_secret
```

### Run the Application

From the `/server` directory:

```
node server.js
```

Or, for auto-restart on file changes during development:

```
npx nodemon server.js
```

The app will be available at `http://localhost:1024` (or whatever `PORT` you set).

## Known Limitations

Being upfront about what's simplified for now rather than production-hardened:

- **Passwords are stored and compared in plain text.** Hashing (bcrypt) is planned but not yet implemented — don't reuse real passwords when testing this.
- **Quiz deadlines are enforced on the client, not the server.** The countdown, warnings, and auto-submit all live in the browser; the API currently accepts a submission whenever it arrives rather than checking elapsed time against the quiz's time limit server-side.
- **No automated tests yet.**

## What I Learned Through This Project

This was my first full-stack project, built independently without following a tutorial or using outside help on the backend. Concepts worked through hands-on include:

- Designing a REST API and structuring an Express app (routes / middleware / controllers)
- JWT-based authentication and role-based authorization
- Relational database design, including associative entities for many-to-many relationships (student attempts, per-question responses)
- Writing and reasoning about SQL transactions
- Client-server timing/trust boundaries (and where they still need tightening)
- Frontend-backend integration without a framework

## Future Direction

- Hash passwords before storing them
- Enforce the quiz time limit server-side as the source of truth
- Add automated tests
- Improve request validation and error handling consistency
- API documentation
- Deployment/production configuration

## Author

**Aditya Singh**

Independently designed and built as a personal full-stack learning project.

## Repository

GitHub: <https://github.com/AdityaSingh21Official/Quiz_Application>
