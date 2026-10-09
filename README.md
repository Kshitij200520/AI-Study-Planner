# AI Study Planner

AI Study Planner is a full-stack learning companion. A learner can check a starting point with a diagnostic quiz, create a personalized day-by-day study plan, track real task completion, catch up with a previewed schedule, revise due topics, ask a contextual AI tutor, and import a text-based syllabus PDF.

Diagnostic performance is scored deterministically from submitted answers. Plan recommendations use recorded quiz evidence when available; no ability or mastery claim is made without assessment data. Task completion and quiz accuracy are reported separately.

## Features

- Register and sign in with bcryptjs password hashing, JWT authentication, and protected routes.
- Request a password reset with an email OTP. OTP values are stored as bcrypt hashes and expire after 10 minutes. Local development can use a demo OTP only when SMTP is unavailable; that fallback is disabled in production.
- Generate 7-, 14-, 21-, or 30-day study plans with Groq's `llama-3.3-70b-versatile` model, a selected knowledge level, available daily hours, and optional exam date.
- Take a subject/topic diagnostic. Correct answers and explanations stay server-side until submission; backend code scores answers and aggregates topic results.
- Generate adaptive plans from submitted diagnostic evidence. Daily goals include objectives, task time estimates, practice, revision, and checkpoints; output is validated before saving.
- Save user-owned plans and task/day completion. Preview a deterministic catch-up schedule, respect a daily capacity, prioritize measured weak topics, and approve changes without losing the prior plan version.
- Create due revision topics from completed tasks or completed days. Sessions include revealable flashcards and a retrieval quiz scored on the server; the transparent schedule uses 1, 3, 7, 14, and 30-day intervals and resets to one day below 80% accuracy.
- Ask a contextual Groq tutor about a plan in Beginner-Friendly, Detailed, or Interview Preparation style. Conversations are stored with the owning user and plan.
- Upload a PDF syllabus up to 5 MB, extract selectable text, edit the outline, set a target date within 30 days and daily hours, and generate a topic-validated plan.
- View plans, task activity, quiz accuracy, topic-level diagnostic estimates, weak topics, due revisions, a seven-day task trend, and a grounded AI progress summary.
- Configure timezone-aware daily email reminders for today's pending study tasks, optionally including overdue tasks, with a settings preview and a test-email action. A database-unique delivery record prevents duplicate reminders across concurrent server instances.

## Tech Stack

- Frontend: React 19, Vite 8, React Router, Axios, CSS
- Backend: Node.js, Express 5
- Database: MongoDB and Mongoose
- AI: Groq SDK, configurable model (default `openai/gpt-oss-20b`)
- Authentication: JWT and bcryptjs
- Email: Nodemailer with Gmail SMTP or another SMTP provider
- PDF handling: Multer memory uploads and `pdf-parse`

## Requirements

- Recent Node.js (20.19+ or 22.12+) and npm
- MongoDB available locally or through a MongoDB connection string
- Groq API key for AI assessments, plans, tutor, revision quizzes, and AI summaries
- SMTP credentials for real password-reset and daily reminder email delivery

## Setup

1. Install backend dependencies and create `server/.env`:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/ai-study-planner
JWT_SECRET=replace-with-a-long-random-secret
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-address@gmail.com
SMTP_PASS=your-google-app-password
SMTP_FROM=your-address@gmail.com
CLIENT_URL=http://localhost:5173
REMINDER_SCHEDULER_ENABLED=true
```

For Gmail, use an App Password, not the account password. Never commit `.env` or share its secrets. The API key remains server-side.

```bash
cd server
npm install
npm run dev
```

2. In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The client API currently targets `http://localhost:5001/api`.

## Main API Routes

All listed learning routes require `Authorization: Bearer <JWT>` unless noted.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/forgot-password` | Send reset OTP |
| POST | `/api/auth/verify-otp` | Verify reset OTP |
| POST | `/api/auth/reset-password` | Set a new password |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/assessments` | Generate a diagnostic |
| GET | `/api/assessments` | List current user's attempts |
| GET | `/api/assessments/:id` | Read an owned assessment |
| POST | `/api/assessments/:id/submit` | Score answers and reveal result |
| POST | `/api/planner/generate` | Generate a plan; optional `assessmentId`, `studyHoursPerDay`, and `examDate` |
| GET | `/api/planner` | List owned plans |
| GET | `/api/planner/:id` | Read an owned plan |
| PUT | `/api/planner/:id/progress` | Save task/day completion |
| POST | `/api/planner/:id/rebuild/preview` | Preview catch-up schedule |
| POST | `/api/planner/:id/rebuild/approve` | Approve a signed, expiring preview |
| POST | `/api/planner/:id/adapt/preview` | Preview an existing-plan update from a submitted diagnostic |
| POST | `/api/planner/:id/adapt/approve` | Approve the evidence-based plan update |
| GET | `/api/revisions/due` | List due review topics |
| GET | `/api/revisions/:id` | Read an owned revision item |
| POST | `/api/revisions/:id/start` | Start a revision quiz |
| POST | `/api/revisions/:id/complete` | Score revision and schedule next review |
| POST | `/api/tutor/plans/:planId/messages` | Ask the plan-contextual tutor |
| POST | `/api/syllabus/upload` | Upload a PDF as multipart field `file` plus `topic` |
| GET | `/api/syllabus` | List current user's syllabi |
| GET | `/api/syllabus/:id` | Read an owned syllabus |
| PUT | `/api/syllabus/:id/approve` | Save corrected outline and target date |
| POST | `/api/syllabus/:id/generate` | Generate a syllabus-aligned plan |
| GET | `/api/analytics` | Get current user's measured analytics |
| POST | `/api/analytics/summary` | Generate a data-grounded progress summary |
| GET | `/api/reminders/settings` | Read the authenticated user's reminder settings and schedule status |
| PUT | `/api/reminders/settings` | Save the authenticated user's reminder time, timezone, enable toggle, and overdue preference |
| GET | `/api/reminders/pending-tasks` | Inspect tasks mapped to the user's current local date |
| POST | `/api/reminders/test-email` | Send a rate-limited test only to the authenticated account email |

## Database Models

- `User`: account identity, bcrypt password hash, hashed reset OTP and expiry.
- `StudyPlan`: user ownership, schedule, study-time budget, optional exam date, completion state, activity, and prior versions.
- `Assessment`: user-owned questions, private answer key, submission and topic-wise scored results.
- `RevisionItem`: topic, due date, interval, quiz history, and review attempts.
- `TutorConversation`: bounded conversation history tied to the owning user and plan.
- `Syllabus`: extracted text, editable chapter/topic outline, target date, review status, and generated plan reference.
- `ReminderDelivery`: unique user/local-date claim, lease, retry count, and successful/failed email delivery status.

## Validation

Backend unit tests use Node's built-in test runner:

```bash
cd server
npm test
```

Frontend production build and lint:

```bash
cd client
npm run build
npm run lint
```

## Daily Reminder Scheduler

The Express process starts a `node-cron` worker after connecting to MongoDB. It checks each enabled account once per minute, compares the configured wall-clock time in the user's IANA timezone, and only emails when incomplete tasks map to the user's local date (plus overdue days if selected). MongoDB creates a unique `(userId, localDate)` delivery index before the HTTP server starts. Delivery leases expire after five minutes, failed deliveries can retry up to three attempts, and delivery records expire after 90 days.

For local testing, keep `REMINDER_SCHEDULER_ENABLED=true`, use SMTP settings above, and save a reminder time just before the current time in the chosen timezone. Use `/api/reminders/pending-tasks` or the Reminder Settings page to verify today's task mapping. `POST /api/reminders/test-email` sends only to the signed-in account and is limited to one message every 10 minutes; it does not test the recurring scheduler itself.

This requires a persistent Node.js process and MongoDB. It is not suitable as an in-process job on Vercel or another serverless runtime. For serverless hosting, set `REMINDER_SCHEDULER_ENABLED=false` and deploy a separate always-on worker or implement an authenticated, secret-protected scheduled trigger before routing cron requests. No external scheduler endpoint is enabled by this project.

## Current Limitations

- Scanned/image-only PDFs are not OCR'd; the upload flow reports that selectable text is required.
- Study time is not timed or inferred; analytics explicitly report that it is not tracked.
- There is no email-verification field or flow in the current account model, so reminder delivery uses the registered account email. Add email verification before treating addresses as verified.
- Daily recurring reminders use an in-process `node-cron` worker and require a continuously running Node.js service and MongoDB. Do not rely on this worker in serverless hosting; see the scheduler section for deployment options.
- Catch-up scheduling is deterministic and capacity-checked, not AI-generated. It uses remaining days, daily hours, completion state, exam date, and measured weak-topic priorities.
- Revision intervals are a transparent simple rule, not a claim of scientifically validated spaced repetition.
- AI features require a working Groq API key. AI endpoints are limited per process and user; deploy multiple instances behind shared rate limiting for production scale.
- `GROQ_MODEL` can be set to any model ID enabled for the account. The default is `openai/gpt-oss-20b`; verify account availability in the Groq model catalog.
