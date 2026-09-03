# SmartHorizon Hackathon Operations Portal 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.19-000000.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.16-2D3748.svg)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**SmartHorizon Hackathon Operations Portal** is an end-to-end, enterprise-grade operations platform designed for organizing, managing, evaluating, and monitoring high-stakes hackathons. It brings together event administrators, domain expert judges, mentors, and hundreds of hackathon participants into a unified real-time dashboard ecosystem.

---

## 🌟 Key Features

### 🏢 1. Command & Control Admin Center
* **Real-time Metrics**: Live tracking of registrations, check-in rates, active team submissions, judging progress, and helpdesk tickets.
* **Track & Problem Statement Distribution**: Detailed visibility into team allocations across tracks (Agriculture, SpaceTech, FinTech, Healthcare, AI & Open Innovation).
* **System Operations**: Manage phase transitions, freeze leaderboards, publish global announcements, and audit administrative actions.

### 🎫 2. Participant Registration & QR Check-in
* **Automated QR Code Generation**: Unique QR badges for all registered teams and participants.
* **Fast-Track Check-in Scanner**: Admin and volunteer kiosk mode for scanning team QR codes at venue check-in desks.
* **Attendance Ledger**: Detailed check-in timestamps, reviewer badges, and emergency contact details.

### ⚖️ 3. Dynamic Judging & Multi-Criteria Rubric Engine
* **Criteria Builder**: Custom evaluation rounds (Proposal, Mid-Evaluation, Prototype, Final Presentation) with adjustable weightages and max scores.
* **Dedicated Judge Roster**: Track-specific and problem-statement-specific judge assignment pipelines.
* **Live Review Workspace**: Interactive scoring cards, timer counters, feedback logging, and draft/submit status handling.
* **Scoring Rules & Leaderboard Control**: Lockable results, score normalization, and customizable student visibility flags.

### 👥 4. Team & Submission Management
* **Team Roster & Roles**: Complete management of team leaders and team members (up to 5 per team).
* **Project Submissions**: Centralized repository for project titles, problem statement IDs, demo links, presentation decks, git repo URLs, and tech stacks.
* **Commit & Activity Tracking**: Automated monitoring of repository commits and submission readiness.

### ❓ 5. Real-Time Q&A & Support Helpdesk
* **Categorized Help Tickets**: Technical and organizational question submission channels for participants.
* **Organizer Support Desk**: Support tickets are routed directly to event organizers.
* **Live Status Updates**: Open, Assigned, In-Progress, and Resolved ticket workflow.

### 📢 6. Announcements & Notification System
* **Broadcasting Engine**: Publish targeted announcements (General, Schedule, Technical, Food/Venue, Emergency).
* **Audience Filtering**: Distribute alerts to Everyone, Students, Judges, or specific Tracks.
* **Read Receipts & Pinned Alerts**: High-priority banner notifications with user read-receipt tracking.

---

## 🛠️ Technology Stack

### **Frontend**
* **Framework**: React 18 with TypeScript
* **Build Tool**: Vite 5
* **Styling**: Tailwind CSS, PostCSS, Autoprefixer
* **UI Components & Icons**: Lucide React Icons, Framer Motion
* **Interactive Animations**: Anime.js, Canvas Confetti
* **State & Data Fetching**: TanStack React Query v5, React Hook Form, Zod

### **Backend**
* **Runtime**: Node.js & Express.js (TypeScript)
* **ORM & Database**: Prisma ORM with SQLite (PostgreSQL compatible)
* **Authentication**: JWT (JSON Web Tokens) & Password Hashing via `bcryptjs`
* **Validation & Utilities**: Zod, QR Code Generator (`qrcode`), Zip Manager (`adm-zip`)

---

## 📁 Repository Structure

```
SmartHorizon/
├── backend/                  # Express.js REST API & Prisma Backend
│   ├── prisma/               # Database Schema & Migrations
│   │   └── schema.prisma     # Prisma Data Model definitions
│   ├── src/
│   │   ├── middleware/       # JWT Auth & Role Authorization
│   │   ├── routes/           # REST Endpoints (Auth, Teams, Judging, etc.)
│   │   ├── utils/            # QR Generator, Helper Functions
│   │   ├── db.ts             # Prisma Client instance
│   │   ├── seed.ts           # Seed script for initial setup & data loading
│   │   └── server.ts         # Main Express Server entrypoint
│   └── package.json
│
├── frontend/                 # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── context/          # Auth Context & Global Application State
│   │   ├── features/         # Feature-based Modular Pages & Components
│   │   │   ├── admin/        # Admin Management Dashboard
│   │   │   ├── announcements/# Broadcast & Notification System
│   │   │   ├── checkin/      # QR Code Check-in Scanner
│   │   │   ├── criteria/     # Evaluation Criteria Builder
│   │   │   ├── dashboard/    # Overview Dashboards
│   │   │   ├── judges/       # Judge Evaluation Interface
│   │   │   ├── questions/    # Q&A Helpdesk Portal
│   │   │   ├── reports/      # Leaderboards & Analytics Export
│   │   │   └── teams/        # Team Management Workspace
│   │   ├── shared/           # Reusable UI components & layouts
│   │   ├── App.tsx           # App Router & Layout Shell
│   │   └── main.tsx          # Application Entry Point
│   └── package.json
│
├── Login credentials_judges.md     # Reference judge credentials
├── Login_credentials_participants.md# Reference participant credentials
└── README.md                       # Project Documentation
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v18.x` or `v20.x` higher installed
* **npm** or **yarn** package manager

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Initialize & Migrate Database Schema
npm run prisma:generate
npm run prisma:migrate

# (Optional) Seed Initial Database Records (Hackathon, Tracks, Users, Teams)
npm run seed

# Start Development Backend Server (Port 5000)
npm run dev
```

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite Development Server (Port 5173)
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** in your browser to access the portal.

---

## 🔑 User Access & Credentials

The portal features Role-Based Access Control (RBAC). Default credentials provided for local testing:

### 👑 Administrator Account
* **Email**: `admin@smarthorizon.com`
* **Password**: `admin123`
* **Access**: Full platform control, criteria creation, user management, and leaderboard publishing.

### ⚖️ Judge Accounts
* **Email format**: `judge.<problem_statement_id>@smarthorizon.com` (e.g. `judge.shagr01@smarthorizon.com`)
* **Password**: `judge123`
* **Access**: Track-specific judging portal, submission reviewing, scoring rubrics, and team feedback.
* *Full judge roster available in [`Login credentials_judges.md`](Login%20credentials_judges.md).*

### 👥 Participant Accounts
* **Password**: `student123`
* **Access**: Team dashboard, QR ticket badge, project submission link upload, Q&A support helpdesk.
* *Full participant list available in [`Login_credentials_participants.md`](Login_credentials_participants.md).*

---

## 🔌 API Endpoint Highlights

| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | Authenticate user and issue JWT |
| **Auth** | `GET` | `/api/auth/me` | Fetch authenticated user profile |
| **Dashboard**| `GET` | `/api/dashboard/stats` | Retrieve platform-wide metrics & team distributions |
| **Teams** | `GET` | `/api/teams` | List registered teams with filters |
| **Teams** | `POST` | `/api/teams/:id/checkin` | Process QR check-in for team |
| **Judging** | `GET` | `/api/criteria` | Get judging rounds and criteria rubrics |
| **Judging** | `POST` | `/api/reviews` | Submit team evaluation scores and feedback |
| **Questions**| `GET` | `/api/questions` | List helpdesk questions |
| **Alerts** | `GET` | `/api/announcements` | Retrieve active announcements |
| **Reports** | `GET` | `/api/reports/leaderboard` | Generate live leaderboard rankings |

---

## 📜 License

This project is released under the [MIT License](LICENSE).

---

<p center>
Made for SmartHorizon Hackathon Operations.
</p>
