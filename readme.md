# Quiz Application

> **Status: Under Active Development**

A full-stack quiz application being developed entirely from scratch using Node.js, Express, MySQL, HTML, CSS, and JavaScript.

The project is being built to understand and implement the different components of a real-world full-stack application, including authentication, REST APIs, database design, backend architecture, frontend-backend communication, quiz management, and result processing.

This project is currently under development. The architecture and functionality may continue to change as new features are implemented and existing components are improved.

## Overview

The Quiz Application is designed around two primary user roles:

- **Teacher** — Create and manage quizzes, questions, and answer options, and manage quiz-related data.
- **Student** — Browse available quizzes, attempt quizzes, submit answers, and view results.

The long-term goal is to build a complete quiz platform with a clean separation between the frontend, backend, authentication, business logic, and database layers.

## Current Development Status

The following components are currently being implemented or refined:

- User authentication
- JWT-based authentication
- Authentication middleware
- Teacher functionality
- Student functionality
- Quiz creation and management
- Question and option management
- MySQL database integration
- REST API development
- Frontend and backend integration
- Quiz attempt functionality
- Quiz timing and submission logic
- Result processing

### Planned Improvements

The project is still evolving, and additional functionality is planned, including:

- Complete teacher and student workflows
- Improved role-based authorization
- More robust request validation
- Improved error handling
- Detailed result and quiz analytics
- Improved frontend UI/UX
- Real-time functionality
- Automated testing
- API documentation
- Production deployment

The development roadmap may change as the project progresses.

## Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js
- REST APIs
- JSON Web Tokens (JWT)

### Database

- MySQL
- MySQL2

### Development Tools

- Git
- GitHub
- npm

## Architecture

The application follows a layered full-stack architecture:

```text
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

The intention is to keep routing, authentication, business logic, and database operations separated as the application grows.

## Authentication

Authentication is being implemented using JSON Web Tokens.

The general authentication flow is:

```text
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
JWT
 |
 | Authenticated Request
 v
Authentication Middleware
 |
 +---- Valid Token ----> Protected Route
 |
 +---- Invalid Token --> Request Rejected
```

Protected routes can use the authentication middleware to verify the identity of the requesting user before allowing access to restricted functionality.

## Quiz Flow

The intended teacher workflow is:

```text
Teacher Login
      |
      v
Teacher Dashboard
      |
      v
Create Quiz
      |
      +---- Quiz Details
      |
      +---- Questions
      |
      +---- Answer Options
      |
      v
     Quiz
```

The intended student workflow is:

```text
Student Login
      |
      v
Student Dashboard
      |
      v
Select Quiz
      |
      v
Attempt Quiz
      |
      v
Submit Answers
      |
      v
Evaluate Attempt
      |
      v
View Result
```

These workflows are still under development and may change as additional requirements and functionality are introduced.

## Project Structure

The current project is organized into separate frontend and backend components:

```text
Quiz_Application/
|
├── public/
|   ├── HTML files
|   ├── CSS
|   └── Client-side JavaScript
|
├── server/
|   ├── controllers/
|   ├── database/
|   ├── middlewares/
|   ├── routes/
|   └── server.js
|
├── package.json
├── package-lock.json
└── README.md
```

The structure is intended to keep different responsibilities separated and make the application easier to maintain as development continues.

## Getting Started

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MySQL
- Git

### Clone the Repository

```bash
git clone https://github.com/AdityaSingh21Official/Quiz_Application.git
cd Quiz_Application
```

### Install Dependencies

Install the project dependencies:

```bash
npm install
```

If the backend has its own dependencies, install them from the server directory:

```bash
cd server
npm install
```

### Environment Configuration

Create an environment configuration file for the backend and provide the required database credentials.

Example:

```env
PORT=1024

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=quiz_application
```

Do not commit environment files or database credentials to the repository.

### Run the Application

Start the backend server from the appropriate directory:

```bash
node server.js
```

The application can then be accessed through the configured local server address.

## What I Am Learning Through This Project

This project is primarily a hands-on learning project. Rather than following a tutorial and reproducing an existing application, I am building the system independently and learning how its individual components work together.

Some of the concepts being explored include:

- Designing REST APIs
- Express.js application structure
- Backend routing
- Middleware
- JWT authentication
- Authentication and authorization
- MySQL database design
- SQL queries and relationships
- CRUD operations
- Request validation
- Error handling
- Frontend-backend communication
- Client-side authentication
- Quiz and result processing
- Structuring a maintainable backend

## Future Direction

As development continues, the application will gradually move toward a more complete and production-oriented architecture.

Some areas I intend to explore further include:

- Real-time communication
- WebSocket-based updates
- Automated testing
- Better authorization strategies
- Improved database design
- API documentation
- Performance optimization
- Deployment
- Production configuration

## Project Philosophy

The primary purpose of this project is not simply to create a quiz website.

It is an attempt to understand what happens behind a full-stack application:

```text
Frontend
   |
   v
HTTP Request
   |
   v
Express Route
   |
   v
Middleware
   |
   v
Controller
   |
   v
Database Operation
   |
   v
MySQL
   |
   v
Response
   |
   v
Frontend
```

Every part of the application is being implemented incrementally to build a stronger understanding of how these components interact.

## Author

**Aditya Singh**

This project is independently designed and developed by me as a personal full-stack development project.

## Repository

GitHub:
https://github.com/AdityaSingh21Official/Quiz_Application

---

**Note:** This repository is currently under active development. Features, architecture, and implementation details may change as the project progresses.
