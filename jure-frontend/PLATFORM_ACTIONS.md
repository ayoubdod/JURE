# Platform Actions Documentation

This document contains a comprehensive list of all actions available in the Jure platform.

## Table of Contents
1. [Authentication & User Management](#authentication--user-management)
2. [Cases Management](#cases-management)
3. [Clients Management](#clients-management)
4. [Documents/Library Management](#documentslibrary-management)
5. [Tasks Management](#tasks-management)
6. [Appointments Management](#appointments-management)
7. [Conversations/Chat](#conversationschat)
8. [Team/Cabinet Members](#teamcabinet-members)
9. [Dashboard](#dashboard)
10. [Legal AI](#legal-ai)
11. [Calendar](#calendar)
12. [Case Sessions](#case-sessions)
13. [UI Actions](#ui-actions)
14. [Navigation Routes](#navigation-routes)

---

## Authentication & User Management

### User Registration & Login
- **Register User** (`apiRegisterUser`)
  - Endpoint: `POST /dj-rest-auth/registration/`
  - Action: Register a new user account
  - Requires: User registration form data

- **Login User** (`apiLoginUser`)
  - Endpoint: `POST /dj-rest-auth/login`
  - Action: Authenticate user and receive access/refresh tokens
  - Requires: Email and password

- **Logout User** (`apiLogoutUser`)
  - Endpoint: `POST /dj-rest-auth/logout/`
  - Action: Logout current user session

### Password Management
- **Reset Password** (`apiResetPassword`)
  - Endpoint: `POST /dj-rest-auth/password/reset/`
  - Action: Request password reset email
  - Requires: Email address

- **Reset Password Confirm** (`apiResetPasswordConfirm`)
  - Endpoint: `POST /dj-rest-auth/password/reset/confirm/`
  - Action: Confirm and set new password
  - Requires: Reset token and new password

- **Change Password** (`apiChangePassword`)
  - Endpoint: `POST /dj-rest-auth/password/change/`
  - Action: Change password for authenticated user
  - Requires: Current password and new password

### Email Verification
- **Confirm Email** (`apiConfirmEmail`)
  - Endpoint: `POST /dj-rest-auth/registration/verify-email`
  - Action: Verify user email address
  - Requires: Verification key

- **Resend Verification Email** (`apiResendVerificationEmail`)
  - Endpoint: `POST /dj-rest-auth/registration/resend-email/`
  - Action: Resend email verification link
  - Requires: Email address

### User Profile Management
- **Get Current User** (`apiGetMe`)
  - Endpoint: `GET /dj-rest-auth/user/`
  - Action: Retrieve current authenticated user information

- **Update User** (`apiUpdateUser`)
  - Endpoint: `PATCH /dj-rest-auth/user/`
  - Action: Update user profile information
  - Requires: User update form data

- **Update User Image** (`apiUpdateUserImage`)
  - Endpoint: `PATCH /dj-rest-auth/user/`
  - Action: Update user profile image
  - Requires: Image file

- **Update Cabinet** (`apiUpdateCabinet`)
  - Endpoint: `PATCH /dj-rest-auth/user/`
  - Action: Update cabinet/firm information
  - Requires: Cabinet update form data

---

## Cases Management

### Case CRUD Operations
- **Get Cases** (`apiGetCases`)
  - Endpoint: `GET /cases/cases/`
  - Action: Retrieve list of cases with optional filtering
  - Parameters: `status`, `search`, `page`, `page_size`, `client`

- **Get Case** (`apiGetCase`)
  - Endpoint: `GET /cases/cases/{id}/`
  - Action: Retrieve specific case details

- **Create Case** (`apiCreateCase`)
  - Endpoint: `POST /cases/cases/`
  - Action: Create a new case
  - Requires: Case create form data

- **Update Case** (`apiUpdateCase`)
  - Endpoint: `PATCH /cases/cases/{id}/`
  - Action: Update existing case information
  - Requires: Case update form data with case ID

- **Delete Case** (`apiDeleteCase`)
  - Endpoint: `DELETE /cases/cases/{id}/`
  - Action: Delete a case

### Case UI Actions
- View case details
- Create new case (via modal)
- Edit case (via modal)
- Delete case (via confirmation modal)
- Filter cases by status
- Search cases
- Navigate to case details

---

## Clients Management

### Client CRUD Operations
- **Get Clients** (`apiGetClients`)
  - Endpoint: `GET /clients/clients/`
  - Action: Retrieve list of all clients

- **Get Client** (`apiGetClient`)
  - Endpoint: `GET /clients/clients/{id}/`
  - Action: Retrieve specific client details

- **Create Client** (`apiCreateClient`)
  - Endpoint: `POST /clients/clients/`
  - Action: Create a new client
  - Requires: Client create form data

- **Update Client** (`apiUpdateClient`)
  - Endpoint: `PATCH /clients/clients/{id}/`
  - Action: Update existing client information
  - Requires: Client update form data with client ID

- **Delete Client** (`apiDeleteClient`)
  - Endpoint: `DELETE /clients/clients/{id}/`
  - Action: Delete a client

### Client UI Actions
- View client profile
- Create new client (via modal)
- Edit client (via modal)
- Delete client (via confirmation modal)
- View client cases
- Filter clients

---

## Documents/Library Management

### Document CRUD Operations
- **Get Documents** (`apiGetDocuments`)
  - Endpoint: `GET /library/documents/`
  - Action: Retrieve list of documents
  - Parameters: `all` (boolean)

- **Get Document** (`apiGetDocument`)
  - Endpoint: `GET /library/documents/{id}/`
  - Action: Retrieve specific document details

- **Create Document** (`apiCreateDocument`)
  - Endpoint: `POST /library/documents/`
  - Action: Upload/create a new document
  - Requires: Document create form data (including file)

- **Update Document** (`apiUpdateDocument`)
  - Endpoint: `PATCH /library/documents/{id}/`
  - Action: Update document metadata or replace file
  - Requires: Document update form data with document ID

- **Delete Document** (`apiDeleteDocument`)
  - Endpoint: `DELETE /library/documents/{id}/`
  - Action: Delete a document

### Document UI Actions
- Upload document
- View document preview
- Download document
- Open document in new window
- Edit document metadata
- Delete document
- Search documents
- Filter documents
- Tag documents
- Link documents to cases/clients

---

## Tasks Management

### Task CRUD Operations
- **Get Tasks** (`apiGetTasks`)
  - Endpoint: `GET /tasks/tasks/`
  - Action: Retrieve list of all tasks

- **Get Task** (`apiGetTask`)
  - Endpoint: `GET /tasks/tasks/{id}/`
  - Action: Retrieve specific task details

- **Create Task** (`apiCreateTask`)
  - Endpoint: `POST /tasks/tasks/`
  - Action: Create a new task
  - Requires: Task create form data

- **Update Task** (`apiUpdateTask`)
  - Endpoint: `PATCH /tasks/tasks/{id}/`
  - Action: Update existing task information
  - Requires: Task update form data with task ID

- **Delete Task** (`apiDeleteTask`)
  - Endpoint: `DELETE /tasks/tasks/{id}/`
  - Action: Delete a task

### Task UI Actions
- Create new task
- Edit task
- Delete task
- View task details
- Mark task as complete
- Set task priority
- Set task due date
- Assign task to team member
- Link task to case/client
- Filter tasks by status/priority
- View today's tasks

---

## Appointments Management

### Appointment CRUD Operations
- **Get Appointments** (`apiGetAppointments`)
  - Endpoint: `GET /tasks/appointments/`
  - Action: Retrieve list of appointments
  - Parameters: Various filtering options

- **Get Appointment** (`apiGetAppointment`)
  - Endpoint: `GET /tasks/appointments/{id}/`
  - Action: Retrieve specific appointment details

- **Create Appointment** (`apiCreateAppointment`)
  - Endpoint: `POST /tasks/appointments/`
  - Action: Create a new appointment
  - Requires: Appointment create form data (title, start_at, end_at, etc.)

- **Update Appointment** (`apiUpdateAppointment`)
  - Endpoint: `PATCH /tasks/appointments/{id}/`
  - Action: Update existing appointment
  - Requires: Appointment update data with appointment ID

- **Delete Appointment** (`apiDeleteAppointment`)
  - Endpoint: `DELETE /tasks/appointments/{id}/`
  - Action: Delete an appointment

### Appointment UI Actions
- Schedule appointment
- View appointment details
- Edit appointment
- Delete appointment
- Add attendees
- Link to client/case
- Set appointment status (scheduled/done/cancelled)
- View calendar view

---

## Conversations/Chat

### Conversation Operations
- **List Conversations** (`apiListConversations`)
  - Endpoint: `GET /chat/conversations/`
  - Action: Retrieve list of all conversations

- **Get Messages** (`apiGetMessages`)
  - Endpoint: `GET /chat/conversations/{conversationId}/messages/`
  - Action: Retrieve messages for a conversation
  - Parameters: `before`, `after`, `limit`

- **Create Conversation** (`apiCreateConversation`)
  - Endpoint: `POST /chat/conversations/`
  - Action: Create a new conversation
  - Requires: Participants array, optional title and type (direct/group)

- **Delete Conversation** (`apiDeleteConversation`)
  - Endpoint: `DELETE /chat/conversations/{conversationId}/`
  - Action: Delete a conversation

### Message Operations
- **Send Message** (`apiSendMessage`)
  - Endpoint: `POST /chat/messages/`
  - Action: Send a message in a conversation
  - Requires: Message form data (content, file, type, replyTo)

- **Mark Message as Read** (`apiMarkRead`)
  - Endpoint: `POST /chat/messages/{messageId}/mark_read/`
  - Action: Mark a message as read

### Chat UI Actions
- Start new conversation
- Send text message
- Send file attachment
- Reply to message
- Mark messages as read
- View conversation history
- Delete conversation
- View unread message count
- Real-time message notifications
- Voice call (via WebRTC)
- Media gallery view

---

## Team/Cabinet Members

### Cabinet Member Operations
- **Get Cabinet Members** (`apiGetCabinetMembers`)
  - Endpoint: `GET /cabinets/members/`
  - Action: Retrieve list of cabinet members

- **Get All Cabinet Members** (`apiGetAllCabinetMembers`)
  - Endpoint: `GET /cabinets/members/all/`
  - Action: Retrieve all cabinet members (expanded list)

- **Get Cabinet Member** (`apiGetCabinetMember`)
  - Endpoint: `GET /cabinets/members/{id}/`
  - Action: Retrieve specific cabinet member details
  - Parameters: `expand`

- **Get My Cabinet Member** (`apiGetMyCabinetMember`)
  - Endpoint: `GET /cabinets/members/get_my_cabinet_member/`
  - Action: Retrieve current user's cabinet member profile
  - Parameters: `expand`

- **Create Cabinet Member** (`apiCreateCabinetMember`)
  - Endpoint: `POST /cabinets/members/`
  - Action: Add a new team member to the cabinet
  - Requires: Cabinet member create form data

- **Update Cabinet Member** (`apiUpdateCabinetMember`)
  - Endpoint: `PATCH /cabinets/members/{id}/`
  - Action: Update cabinet member information
  - Requires: Cabinet member update form data with member ID

- **Delete Cabinet Member** (`apiDeleteCabinetMember`)
  - Endpoint: `DELETE /cabinets/members/{id}/`
  - Action: Remove a member from the cabinet

- **Update Cabinet Member Role** (`apiUpdateCabinetMemberRole`)
  - Endpoint: `PATCH /cabinets/members/{id}/role/`
  - Action: Update member's role and permissions
  - Requires: Role and permissions data

- **Get Role Permissions** (`apiGetRolePermissions`)
  - Endpoint: `GET /cabinets/roles/permissions/`
  - Action: Retrieve available role permissions

### Team UI Actions
- Add team member
- Edit team member
- Delete team member
- View team member profile
- Assign roles
- Manage permissions
- View team list

---

## Dashboard

### Dashboard Operations
- **Get Cabinet Stats** (`apiGetCabinetStats`)
  - Action: Aggregate dashboard statistics
  - Returns: Total clients, cases, tasks, recent cases, today's tasks, recent activity, KPIs

### Dashboard UI Actions
- View dashboard overview
- View statistics cards (clients, cases, tasks)
- View recent cases
- View today's tasks
- View recent activity feed
- Quick actions:
  - Create new case
  - Add new client
  - Schedule appointment
  - Create task
  - Upload document
- Professional tools:
  - Matter timeline
  - Deadlines card
  - Engagement budget
  - Evidence manager
  - Research notebook
  - Risk KPIs
  - Conflict check
  - Clause library
  - Matter close

---

## Legal AI

### Legal AI Actions
- **Send AI Message**
  - Action: Send message to Juria AI assistant
  - Features:
    - Legal research and case analysis
    - Contract review and drafting
    - Document preparation
    - Regulatory compliance questions

### Legal AI UI Actions
- Chat with AI assistant
- Quick actions:
  - Contract Review
  - Legal Research
  - Document Drafting
- Voice input
- View conversation history
- Clear conversation

---

## Calendar

### Calendar Operations
- **Get Calendar Events** (`apiGetCalendarEvents`)
  - Endpoint: `GET /tasks/calendar/events`
  - Action: Retrieve calendar events (tasks and appointments)
  - Parameters: Date range, filters

### Calendar UI Actions
- View calendar (month/week/day view)
- View tasks on calendar
- View appointments on calendar
- Create event from calendar
- Click to view event details
- Navigate between dates
- Filter by event type

---

## Case Sessions

### Case Session Operations
- **Get Case Sessions** (`apiGetCaseSessions`)
  - Endpoint: `GET /cases/case-sessions/`
  - Action: Retrieve list of case sessions

- **Get Case Session** (`apiGetCaseSession`)
  - Endpoint: `GET /cases/case-sessions/{id}/`
  - Action: Retrieve specific case session details

- **Create Case Session** (`apiCreateCaseSession`)
  - Endpoint: `POST /cases/case-sessions/`
  - Action: Create a new case session
  - Requires: Case session create form data

- **Update Case Session** (`apiUpdateCaseSession`)
  - Endpoint: `PATCH /cases/case-sessions/{id}/`
  - Action: Update existing case session
  - Requires: Case session update form data with session ID

- **Delete Case Session** (`apiDeleteCaseSession`)
  - Endpoint: `DELETE /cases/case-sessions/{id}/`
  - Action: Delete a case session

---

## UI Actions

### Document Preview Actions
- Preview document (PDF, images, videos)
- Open document in new window
- Download document
- View document metadata
- Handle unsupported file types

### Navigation Actions
- Navigate to dashboard
- Navigate to cases
- Navigate to clients
- Navigate to library
- Navigate to tasks/calendar
- Navigate to conversations
- Navigate to team
- Navigate to settings
- Navigate to legal AI
- Navigate to profile

### Theme & Language Actions
- Toggle theme (light/dark)
- Switch language
- View in RTL mode (for supported languages)

### Notification Actions
- View notifications
- Mark notifications as read
- View unread count
- Real-time notification updates

### Profile Actions
- View own profile
- View other user profiles
- Edit profile
- Upload profile image
- Change password
- Logout

---

## Navigation Routes

### Public Routes
- `/` - Landing page
- `/about` - About page
- `/features` - Features page
- `/pricing` - Pricing page
- `/privacy` - Privacy policy
- `/terms` - Terms of service
- `/status` - Status page
- `/status/subscribe` - Status subscription
- `/contact` - Contact page
- `/docs` - Documentation
- `/signin` - Sign in page
- `/signup` - Sign up page
- `/demo` - Demo page
- `/forgot-password` - Forgot password
- `/password-reset-confirm` - Password reset confirmation
- `/verify-email` - Email verification
- `/verify-email-waiting` - Email verification waiting

### Authenticated Routes (Dashboard)
- `/dashboard` - Main dashboard
- `/dashboard/team` - Team members
- `/dashboard/me` - Own profile
- `/dashboard/profile` - Profile
- `/dashboard/profile/:id` - User profile by ID
- `/dashboard/cases` - Cases management
- `/dashboard/library` - Document library
- `/dashboard/clients` - Clients management
- `/dashboard/legal-ai` - Legal AI assistant
- `/dashboard/conversations` - Conversations/chat
- `/dashboard/messages` - Messages (alias for conversations)
- `/dashboard/tasks` - Tasks/Calendar
- `/dashboard/calendar` - Calendar view
- `/dashboard/tasks/:id/edit` - Edit task
- `/dashboard/settings` - Settings
- `/dashboard/notifications` - Notifications (alias for settings)
- `/dashboard/help` - Help (alias for settings)

---

## Additional Features

### Quick Actions (Dashboard)
1. **Create Case** - Open case creation modal
2. **Add Client** - Open client creation modal
3. **Schedule Appointment** - Open appointment scheduling dialog
4. **Create Task** - Open task creation modal
5. **Upload Document** - Open document upload modal

### Professional Tools (Dashboard)
1. **Matter Timeline** - View case timeline
2. **Deadlines Card** - Track upcoming deadlines
3. **Engagement Budget** - Monitor case budgets
4. **Evidence Manager** - Manage case evidence
5. **Research Notebook** - Legal research notes
6. **Risk KPIs** - Risk metrics dashboard
7. **Conflict Check** - Check for conflicts of interest
8. **Clause Library** - Access clause templates
9. **Matter Close** - Close matter workflow

### Legal AI Quick Actions
1. **Contract Review** - Review contracts with AI
2. **Legal Research** - Research legal precedents
3. **Document Drafting** - Draft documents with AI assistance

---

## Notes

- All API endpoints use Bearer token authentication (except public endpoints)
- Most endpoints support pagination via `page` and `page_size` parameters
- File uploads use FormData format
- The platform supports real-time updates via WebSocket for chat/conversations
- All dates/times are in ISO 8601 format
- The platform supports multiple languages with RTL support for Arabic/Hebrew

---

*Last Updated: Generated from codebase analysis*
*Platform: Jure Legal Management System*


