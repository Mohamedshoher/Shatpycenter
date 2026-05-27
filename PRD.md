# Product Requirements Document (PRD)
## Al-Shatibi LMS v2.0 (نظام إدارة مركز الشاطبي التعليمي)

### 1. Project Overview
Al-Shatibi LMS v2.0 is a comprehensive, modern, mobile-first web application designed specifically for managing Quran memorization centers and small-to-medium educational institutions. It provides tools for tracking student progress, managing teachers, scheduling exams, handling financial accounting, and facilitating communication with parents.

### 2. Objectives and Goals
- To digitize and automate the daily operations of the educational center.
- To provide a seamless, mobile-optimized experience for all users (Directors, Supervisors, Teachers, and Parents).
- To ensure accurate financial tracking (salaries, deductions, and center revenue/custody).
- To enforce a standardized exam cycle ensuring every student is tested regularly.
- To improve communication between the administration, teachers, and parents via an integrated chat system.

### 3. Tech Stack
- **Frontend Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4, Framer Motion (for animations), Lucide React (for icons)
- **State Management:** Zustand, React Query
- **Backend & Database:** Supabase (PostgreSQL), Firebase (Push Notifications/Chat)
- **Language:** TypeScript
- **PWA Support:** @ducanh2912/next-pwa for offline and app-like capabilities

### 4. User Roles and Permissions (RBAC)
- **Director (المدير):** Full system access. Can approve pending students, manage finances, configure automation rules, and permanently delete records.
- **Supervisor (المشرف):** Can track attendance, monitor the exams cycle, and view reports. Cannot access sensitive financial data or perform hard deletes.
- **Teacher (المعلم):** Can manage only their assigned groups and students, record attendance, enter exam grades, and view their own financial card.
- **Parent (ولي الأمر):** Simplified interface to track only their child's progress, attendance, and exam results, and to communicate with teachers/administration via chat.

### 5. Key Features & Modules

#### 5.1. Authentication System
- Direct password verification against the database.
- **Mobile-First UX:** Numeric keypad auto-trigger for mobile login, responsive scaling, and alphabetic teacher sorting.
- Default landing on the "Parent" tab to serve the largest user base quickly.

#### 5.2. Student Management
- **Pending Status Workflow:** New students are added as `pending` and must be approved by the Director/Supervisor before becoming `active`. Rejection archives the student with a reason.
- Fixed sequential numbering for all students.
- Archiving system (soft delete) to maintain historical data without cluttering active views.

#### 5.3. Teacher & Staff Management
- Detailed teacher profiles with assigned roles and accounting types.
- **Attendance Tracking:** Granular statuses (present, absent, quarter-day absence, half-day absence).
- Flexible groups assignment.

#### 5.4. Financial & Custody Module (الإدارة المالية)
- **Custody Logic (العهد):** Distinguishes between money collected by teachers (custody) and money handed over to the administration (actual center funds).
- **Teacher Financial Cards:** A responsive view for each teacher showing their monthly salary, manual/automatic deductions, and bonuses.
- Debt tracking system.

#### 5.5. Exam Cycle Automation
- Automated scheduling to test 5 students daily based on alphabetical order and group assignment.
- Bi-weekly testing cycle (Week 1: students 1-20, Week 2: students 21-40).
- "Make-up Wednesdays": Dedicated day for students who missed their scheduled exams.

#### 5.6. Automation & Rules Engine
- Automatic daily checks (e.g., at 12:30 PM) to apply deductions (like a "quarter day" penalty) for late teachers based on attendance reports.
- Automated debt flagging.

#### 5.7. Communication (Chat Module)
- Real-time messaging system.
- Direct channels between parents and teachers/administrators.
- Floating/Bottom navigation integration for quick access.

#### 5.8. UI/UX Enhancements
- **Glassmorphism Design:** Modern, semi-transparent components.
- **Bottom Navigation:** Quick access to Home, Students, Attendance, Groups, and Chat.
- **Swipe Gestures:** Mobile users can swipe from the right edge to open the sidebar.
- **Responsive Modals:** Optimized for mobile with condensed tabs and central scrolling.
- Full RTL (Right-to-Left) Arabic language support.

### 6. Database Schema Highlights
- `students`: `group_id`, `status` (active, archived, pending), `enrollment_date`.
- `teachers`: `role` (director, supervisor, teacher), `salary`, `accounting_type`.
- `groups`: Links teachers to students.
- `teacher_attendance`: Tracks daily status and notes.
- `deductions`: Logs financial penalties.
- `automation_rules`: Stores logical conditions for automated system actions.
- `exams`: Historical tracking of recent and old test scores.

### 7. Future Considerations / Roadmap
- Enhanced Push Notifications via Firebase.
- Deeper integration of PWA features for offline attendance taking.
- Advanced analytical dashboards for center performance tracking.
