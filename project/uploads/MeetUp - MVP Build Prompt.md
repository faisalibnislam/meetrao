# MeetUp — MVP Appointment Booking App

Build a complete MVP web application called **MeetUp**.

MeetUp is a simple, modern appointment booking tool inspired by Calendly, but intentionally much smaller and easier to use.

The goal is to let a user:

1. Create an account
2. Connect their Google Calendar
3. Create an appointment/meeting type
4. Define when they are available
5. Share a public booking link
6. Let anyone book a time without creating an account
7. Automatically create a Google Calendar event
8. Automatically generate a Google Meet link
9. Show the booking confirmation to both sides

Do **not** try to recreate Calendly. Keep the product focused, clean, and lightweight.

---

# 1. Product Name

**MeetUp**

Possible tagline:

**Simple scheduling. Less back-and-forth.**

The brand should feel modern, friendly, minimal, and trustworthy.

---

# 2. Core Product Flow

## Host

The main user is the person receiving appointments.

Flow:

Sign Up/Login
→ Connect Google Calendar
→ Email Login/Sign Up
→ Login with Gmail
→ Create Meeting Type
→ Set Availability
→ Get Booking Link
→ Share Link
→ Guest Books
→ Google Calendar Event Created
→ Google Meet Link Generated

## Guest

The guest does NOT need an account.

Flow:

Open booking URL
→ Select date
→ Select available time
→ Enter name and email
→ Confirm booking
→ See confirmation + Google Meet link

Keep the guest experience extremely simple.

---

# 3. MVP Scope

Only build the essential features.

## Authentication

Support:

- Sign in with Google
- Email + password signup
- Email + password login
- Forgot password
- Logout

Use Supabase Auth.

Google authentication and Google Calendar authorization should be treated as separate permissions.

A user may sign into MeetUp with Google, but the application should still clearly handle Calendar connection separately.

---

# 4. Onboarding

After creating an account, show a simple onboarding flow.

### Step 1 — Welcome

Heading:

**Welcome to MeetUp**

Short explanation:

"Set up your availability and start accepting bookings in minutes."

CTA:

**Get Started**

---

### Step 2 — Connect Google Calendar

Explain:

"MeetUp uses your Google Calendar to avoid double bookings and automatically add new appointments."

CTA:

**Connect Google Calendar**

Secondary option:

**I'll do this later**

However, the user should be encouraged to connect Calendar before creating a booking link.

Show connected/disconnected status.

---

### Step 3 — Create First Meeting

Fields:

- Meeting name
- Description
- Duration
- Meeting location

For MVP, meeting location should only support:

**Google Meet**

Duration options:

- 15 minutes
- 30 minutes
- 45 minutes
- 60 minutes

Default:

30 minutes

---

### Step 4 — Availability

Allow the host to define weekly availability.

Example:

Monday
9:00 AM – 5:00 PM

Tuesday
9:00 AM – 5:00 PM

Wednesday
9:00 AM – 5:00 PM

Thursday
9:00 AM – 5:00 PM

Friday
9:00 AM – 3:00 PM

Saturday
Unavailable

Sunday
Unavailable

Allow multiple availability ranges on the same day.

Example:

9:00 AM – 12:00 PM
2:00 PM – 5:00 PM

Also allow the user to select their timezone.

Detect the browser timezone initially, but allow the user to change it.

---

### Step 5 — Setup Complete

Show:

**You're ready to meet.**

Display their booking link.

Example:

`meetup.com/username`

CTA:

**Copy Booking Link**

Secondary:

**View Booking Page**

---

# 5. Dashboard

Create a clean dashboard.

Top navigation:

- MeetUp logo
- Dashboard
- Meetings
- Meeting Types
- Availability
- Settings
- User avatar/menu

Dashboard content:

### Welcome section

"Good morning, [Name]"

Subtext:

"Here's what's happening with your meetings."

### Upcoming Meetings

Show upcoming appointments.

Each item should show:

- Guest name
- Meeting type
- Date
- Time
- Duration
- Google Meet button

Example:

**Product Consultation**

John Smith

Today · 3:00 PM – 3:30 PM

**Join Google Meet**

---

### Empty State

If there are no upcoming meetings:

**No upcoming meetings**

"Your upcoming appointments will appear here."

CTA:

**Create Meeting Type**

---

# 6. Meetings Page

Show:

### Upcoming

List upcoming bookings.

### Past

List previous bookings.

Each booking should display:

- Guest name
- Guest email
- Meeting type
- Date
- Time
- Duration
- Status
- Google Meet link

Statuses:

- Confirmed
- Cancelled

Keep the page simple. Do not build advanced filtering or analytics.

---

# 7. Meeting Types

Create a page showing the host's meeting types.

Example card:

**30 Minute Meeting**

"Quick consultation"

30 min

Google Meet

Active

Booking link:

`meetup.com/faisal/30-minute-meeting`

Actions:

- Edit
- Copy Link
- Enable/Disable

CTA:

**Create Meeting Type**

---

# 8. Create / Edit Meeting Type

Fields:

### Meeting name

Example:

30 Minute Consultation

### Description

Example:

A quick conversation to discuss your project.

### Duration

15 / 30 / 45 / 60 minutes

### Location

Google Meet

### Buffer time

Optional.

Options:

- None
- 5 minutes
- 10 minutes
- 15 minutes

### Minimum notice

How soon before a meeting can someone book?

Options:

- 1 hour
- 2 hours
- 4 hours
- 12 hours
- 24 hours

Default:

1 hour

### Maximum booking window

How far into the future can someone book?

Options:

- 7 days
- 14 days
- 30 days
- 60 days

Default:

30 days

### Active

Toggle to enable/disable the booking type.

---

# 9. Availability

Create a dedicated Availability page.

Show the user's timezone prominently.

Example:

**Your timezone**

GMT+06:00 — Dhaka

Allow changing timezone.

Then show weekly availability.

Each day should have:

- Enable/disable toggle
- Start time
- End time
- Add another time range

Example:

Monday

☑ 09:00 AM — 12:00 PM

☑ 02:00 PM — 05:00 PM

Button:

**+ Add hours**

For unavailable days:

☐ Saturday

Keep this UI extremely easy to understand.

---

# 10. Public Booking Page

This is one of the most important screens.

URL structure:

`/book/[username]/[meeting-slug]`

Example:

`/book/faisal/30-minute-meeting`

The page should NOT require login.

Desktop layout:

Left side:

- Host name
- Meeting title
- Description
- Duration
- Google Meet
- Optional host avatar

Right side:

Calendar + available times

Example:

**Select a date**

September 2026

[Calendar]

After selecting a date:

**Available times**

09:00 AM
09:30 AM
10:00 AM
10:30 AM
...

Only show available slots.

The page should feel polished and significantly better than a basic form.

---

# 11. Guest Booking Flow

After selecting a time, show a simple form.

Heading:

**Enter your details**

Fields:

- Full name
- Email address
- Optional note

CTA:

**Schedule Meeting**

Do not require account creation.

Do not ask unnecessary questions.

---

# 12. Booking Confirmation

After successful booking:

Heading:

**You're booked!**

Show:

**30 Minute Consultation**

with

Faisal

September 12, 2026

3:00 PM – 3:30 PM

Google Meet

[Join Google Meet]

Also provide:

**Add to Google Calendar**

and optionally:

**Download .ics**

Show guest email:

"A confirmation has been sent to your email."

The confirmation should be visually clear and reassuring.

---

# 13. Host Booking Details

When a booking is created, the host should be able to open the booking from the dashboard.

Show:

Guest:

John Smith

Email:

john@example.com

Meeting:

30 Minute Consultation

Date:

September 12, 2026

Time:

3:00 PM – 3:30 PM

Google Meet:

[Join Meeting]

Actions:

- Cancel Meeting

Do not implement rescheduling in the MVP.

---

# 14. Cancellation

Allow the host to cancel a booking.

Also provide a guest cancellation mechanism if practical.

Cancellation should:

1. Update the MeetUp booking status
2. Cancel/remove the Google Calendar event
3. Free the time slot
4. Show a cancellation confirmation

Do not build a complicated cancellation policy system.

---

# 15. Google Calendar Integration

This is a core feature.

Use the Google Calendar API.

When the host connects Google Calendar:

- Request appropriate Calendar permissions
- Store OAuth credentials securely on the server
- Handle access token expiration
- Refresh tokens when necessary
- Never expose private OAuth credentials to the browser

When a guest books a meeting:

1. Verify the selected time is still available
2. Check Google Calendar for conflicts
3. Check MeetUp bookings for conflicts
4. Create a Google Calendar event
5. Generate a Google Meet conference
6. Save the event ID
7. Save the Meet URL
8. Return the confirmation

Use Google Calendar's conference data functionality to generate the Google Meet link.

---

# 16. Prevent Double Booking

This is extremely important.

Never trust the availability shown on the client.

When the guest clicks:

**Schedule Meeting**

the server must re-check:

- Host availability
- Google Calendar conflicts
- Existing MeetUp bookings
- Meeting duration
- Minimum notice
- Maximum booking window

Only then create the booking.

Two people attempting to book the same time should not both succeed.

The server must be the source of truth.

---

# 17. Time Zones

Treat time zones carefully.

Rules:

- Store actual booking timestamps in UTC
- Store the host's timezone
- Convert times for display
- The public booking page should show times in the appropriate timezone
- Clearly display the timezone on the booking page
- Never perform availability calculations using browser-local time alone

Example:

**Times shown in Bangladesh Standard Time (GMT+6)**

The guest should understand what timezone they are booking.

---

# 18. Database

Use Supabase PostgreSQL.

Suggested tables:

## profiles

- id
- name
- email
- avatar_url
- timezone
- username
- created_at
- updated_at

## meeting_types

- id
- user_id
- name
- description
- duration
- slug
- active
- buffer_minutes
- minimum_notice_minutes
- max_days_ahead
- created_at
- updated_at

## availability

- id
- user_id
- day_of_week
- start_time
- end_time

## bookings

- id
- meeting_type_id
- host_id
- guest_name
- guest_email
- guest_note
- start_time
- end_time
- status
- google_event_id
- google_meet_url
- created_at
- updated_at

## google_connections

- id
- user_id
- google_account_id
- access_token
- refresh_token
- expires_at
- created_at
- updated_at

Design the schema properly rather than blindly copying this structure if you see a better approach.

Use foreign keys and appropriate indexes.

---

# 19. Supabase Security

Security is important even for this MVP.

Use Row Level Security.

Users should only be able to access their own:

- profile
- meeting types
- availability
- bookings
- Google connection

Public booking pages should only expose the minimum information required to make a booking.

Do NOT expose:

- OAuth tokens
- refresh tokens
- private calendar information
- internal database IDs unnecessarily

Never put Supabase service-role credentials in client-side code.

Use server-side operations where privileged access is required.

---

# 20. Email Notifications

For the MVP, design the application so email notifications can be added cleanly.

Recommended provider:

**Resend**

Emails should eventually include:

### Guest confirmation

"Your meeting with [Host] is confirmed."

### Host notification

"[Guest] booked a meeting with you."

### Cancellation

"Your meeting has been cancelled."

If implementing email delivery in the first version is straightforward, include it. Otherwise structure the code so it can be added without major refactoring.

---

# 21. Settings

Create a simple Settings page.

Sections:

### Profile

- Name
- Email
- Username
- Profile photo
- Timezone

### Calendar

- Google Calendar connection status
- Connect
- Disconnect

### Booking Preferences

- Default availability
- Default booking settings

### Account

- Change password
- Logout
- Delete account

Do not overbuild Settings.

---

# 22. Design Direction

The UI should feel like a **high-quality modern SaaS product**, not a template.

Design principles:

- Minimal
- Clean
- Spacious
- Modern
- Friendly
- Professional
- Strong typography
- Excellent hierarchy
- Subtle borders
- Soft radius
- Carefully controlled shadows
- Excellent empty states
- Clear interaction states

Avoid:

- Excessive gradients
- Excessive glassmorphism
- Huge decorative graphics
- Generic dashboard templates
- Overly colorful UI
- Unnecessary animations
- Clutter

The interface should feel somewhere between a polished modern productivity app and a premium scheduling product.

---

# 23. Visual System

Create a consistent design system.

Use:

- One primary brand color
- Neutral background
- Neutral surfaces
- Clear text hierarchy
- Consistent border radius
- Consistent spacing
- Consistent button styles
- Consistent form controls

Typography should prioritize readability.

Use a modern sans-serif font such as Inter or a similar high-quality UI font.

Make the booking page especially polished because it is the public-facing part of the product.

---

# 24. Responsive Design

The entire application must work well on:

- Desktop
- Tablet
- Mobile

The public booking experience is especially important on mobile.

On mobile:

- Stack booking page sections vertically
- Keep calendar usable
- Make time slots easy to tap
- Use full-width primary actions

---

# 25. Important UI States

Implement proper states throughout the application.

Include:

- Loading
- Empty
- Success
- Error
- Disabled
- Saving
- Connection in progress
- Calendar connection failed
- Booking failed
- Time slot became unavailable
- Meeting cancelled
- No available times

For example, if another person books a slot while the guest is viewing the page:

Show:

**This time is no longer available**

Then refresh available times.

Do not show raw technical errors to users.

---

# 26. Pages / Screens

Build these screens:

## Authentication

- Login
- Sign Up
- Forgot Password

## Onboarding

- Welcome
- Connect Google Calendar
- Create Meeting
- Availability
- Setup Complete

## Application

- Dashboard
- Meetings
- Meeting Types
- Create Meeting Type
- Edit Meeting Type
- Availability
- Settings

## Public

- Public Booking Page
- Guest Details
- Booking Confirmation
- Booking Cancelled

## Supporting UI

- Cancel confirmation
- Calendar connection modal
- Toast notifications
- Loading states
- Empty states
- Error states

---

# 27. Navigation

Desktop sidebar or clean top navigation is acceptable.

Prefer a simple navigation structure:

MeetUp

Dashboard
Meetings
Meeting Types
Availability

----------------

Settings

User Profile

Do not create unnecessary navigation items.

---

# 28. Technical Stack

Use:

- Next.js
- TypeScript
- React
- Tailwind CSS
- Supabase
- Supabase Auth
- PostgreSQL
- Google Calendar API
- Google OAuth
- Google Meet
- Vercel

Use modern Next.js App Router patterns.

Keep the architecture clean and maintainable.

---

# 29. Development Approach

Build the application in logical stages.

## Phase 1

Project setup

- Next.js
- TypeScript
- Tailwind
- Supabase
- Authentication
- Base layout
- Design system

## Phase 2

Core host functionality

- Profile
- Meeting types
- Availability
- Dashboard
- Meetings

## Phase 3

Google integration

- Google OAuth
- Google Calendar connection
- Calendar conflict checking
- Google Meet generation

## Phase 4

Public booking

- Public URL
- Calendar
- Available slots
- Guest details
- Booking creation

## Phase 5

Booking management

- Confirmation
- Host booking details
- Cancellation
- Calendar updates

## Phase 6

Polish

- Loading states
- Error states
- Empty states
- Responsive design
- Accessibility
- Validation
- Security review

Do not attempt to build everything in one giant component.

---

# 30. Code Quality

Follow these principles:

- TypeScript everywhere
- Strong typing
- Reusable components
- Small focused components
- Server-side validation
- Proper error handling
- Secure secrets
- Environment variables
- No hardcoded credentials
- No duplicated business logic
- No unnecessary dependencies
- Clean folder structure

Business logic such as availability calculation and booking validation should live in reusable server-side functions.

---

# 31. Environment Variables

Prepare the application for environment variables such as:

Supabase URL
Supabase anonymous/public key
Supabase service role key where absolutely necessary
Google OAuth client ID
Google OAuth client secret
Application URL
Resend API key if email is implemented

Never commit secrets to Git.

Create a `.env.example` file.

---

# 32. Booking Algorithm

Implement availability calculation carefully.

For a selected date:

1. Determine the host's timezone
2. Determine the weekday
3. Load availability ranges
4. Generate possible slots based on meeting duration
5. Apply buffer time
6. Apply minimum notice
7. Apply maximum booking window
8. Check MeetUp bookings
9. Check Google Calendar events
10. Remove conflicting slots
11. Return remaining slots

The browser should only display the slots returned by the server.

When booking:

Repeat the conflict check server-side before creating the booking.

---

# 33. MVP Exclusions

Do NOT build these features now:

- Team scheduling
- Round-robin scheduling
- Multiple hosts
- Payments
- Stripe
- Zoom
- Microsoft Teams
- SMS
- Group meetings
- Recurring meetings
- Custom domains
- Embeds
- Advanced analytics
- CRM
- Routing forms
- Workflows
- Automated reminders
- Complex calendar management
- Rescheduling
- Custom branding
- Subscription billing
- Admin dashboard

These can be considered V2.

---

# 34. UX Philosophy

The main product principle is:

**A user should be able to create their first booking link in a few minutes.**

Every screen should answer:

"What does the user need to do next?"

Avoid unnecessary configuration.

Avoid complex terminology.

Use clear language.

For example:

Instead of:

"Configure scheduling availability"

Use:

**Set your availability**

Instead of:

"Create event type"

Use:

**Create meeting**

Instead of:

"Configure conferencing provider"

Use:

**Google Meet**

---

# 35. Important Product Rule

MeetUp should feel like a real product, not a technical demo.

Do not stop after making the basic CRUD functionality.

Pay attention to:

- UX
- visual hierarchy
- spacing
- responsive behavior
- form validation
- loading states
- error handling
- empty states
- accessibility
- booking edge cases
- security

The result should be something that could realistically be shown to users.

---

# 36. First Implementation Task

Before writing a large amount of code:

1. Set up the Next.js project.
2. Set up Supabase.
3. Set up the initial database schema and migrations.
4. Configure authentication.
5. Create the application shell.
6. Build the core design system.
7. Build the authentication screens.
8. Build onboarding.
9. Build meeting types.
10. Build availability.
11. Build the public booking flow.
12. Then implement Google Calendar + Google Meet integration.
13. Finally perform a full UX, security, and edge-case review.

Use database migrations for schema changes.

If Supabase MCP is available, use it to inspect and manage the development Supabase project rather than guessing the database state.

---

# 37. Working Style

Do not ask me unnecessary questions.

Make sensible product decisions when something is not explicitly specified.

When there are multiple reasonable implementation choices, choose the simplest reliable solution appropriate for an MVP.

Do not add features just because they are common in Calendly.

Keep the scope tight.

However, do not simplify away important security or booking correctness.

Before considering the MVP complete, test the entire flow:

Host signup
→ Calendar connection
→ Meeting creation
→ Availability
→ Public booking page
→ Guest booking
→ Calendar event
→ Google Meet link
→ Confirmation
→ Host dashboard
→ Cancellation

Fix any broken flow or inconsistent UX you find.

The final result should be a polished, functional MVP of **MeetUp — Simple scheduling. Less back-and-forth.**