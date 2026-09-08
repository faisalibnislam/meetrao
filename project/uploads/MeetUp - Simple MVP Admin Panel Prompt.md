# MeetUp — Simple Admin Panel

Add a **very simple admin panel** to the existing MeetUp MVP.

The admin panel is for the owner of MeetUp to manage the platform and quickly see what is happening.

Keep this extremely lightweight.

**Do not build a complex SaaS administration system.**

The admin panel should have only the features that are genuinely useful for an MVP.

---

# 1. Admin Access

Create a protected admin area:

`/admin`

There should be two user roles:

- `user`
- `admin`

Only users with the `admin` role can access `/admin`.

Check the admin role **server-side**.

Normal users must not be able to access admin pages or admin data by manually entering URLs.

---

# 2. Admin Navigation

Keep the sidebar very simple:

**MeetUp**

- Dashboard
- Users
- Bookings
- Settings

At the bottom:

- Admin profile
- Logout

That's it.

Do not add unnecessary navigation items.

---

# 3. Admin Dashboard

Create a simple overview.

Heading:

**Dashboard**

Show only four important metrics:

### Total Users

Number of registered MeetUp users.

### Total Bookings

Number of bookings created.

### Upcoming Bookings

Number of upcoming confirmed bookings.

### Meeting Types

Number of active meeting types.

---

## Recent Activity

Below the metrics, show a small list of recent activity.

Examples:

- John created an account
- Sarah created "30 Minute Consultation"
- Mike received a booking
- Jane cancelled a booking

Only show the latest 5–10 items.

Do not build a complex activity system just for this.

Use existing database timestamps/data where possible.

---

# 4. Users

Create:

`/admin/users`

Show a simple user table.

Columns:

- Name
- Email
- Meeting Types
- Bookings
- Status
- Joined
- Action

Example:

| User | Email | Meetings | Bookings | Status | Joined |
|---|---|---:|---:|---|---|
| John Smith | john@example.com | 2 | 14 | Active | Sep 2 |

---

## User Search

Add one simple search field.

Search by:

- Name
- Email
- Username

No advanced filtering is required.

---

# 5. User Details

Create:

`/admin/users/[id]`

Show:

### Profile

- Name
- Email
- Username
- Timezone
- Joined date
- Account status

### Meeting Types

List the user's meeting types.

Show:

- Name
- Duration
- Active/inactive
- Number of bookings

### Recent Bookings

Show the user's latest bookings.

Show:

- Guest
- Meeting
- Date
- Time
- Status

---

## Admin User Actions

Only provide two actions:

**Suspend User**

**Reactivate User**

If the user is active:

> Suspend User

If suspended:

> Reactivate User

Suspending a user should prevent them from using their MeetUp account and accepting new bookings.

Always show a confirmation dialog before suspension.

Do not add user deletion in this MVP unless it is already required elsewhere in the application.

---

# 6. Bookings

Create:

`/admin/bookings`

Show all bookings across MeetUp.

Simple table:

- Host
- Guest
- Meeting
- Date
- Time
- Status

Statuses:

- Confirmed
- Cancelled

---

## Booking Search

Add one search field.

Allow searching by:

- Host name
- Guest name
- Email

Add a simple date filter if easy to implement.

Do not build advanced filtering.

---

# 7. Booking Details

Create:

`/admin/bookings/[id]`

Show:

### Host

Name

Email

### Guest

Name

Email

### Meeting

Meeting name

Duration

### Schedule

Date

Time

Timezone

### Google Meet

Meet link

### Status

Confirmed / Cancelled

That's enough.

The admin does not need to edit booking details.

Do not add booking rescheduling or complicated booking management to the admin panel.

---

# 8. Settings

Create:

`/admin/settings`

Keep this extremely simple.

### General

- App name
- Support email

### Admin Account

- Admin name
- Admin email
- Logout

Do not create complicated platform settings.

---

# 9. Design

The admin panel should use the same MeetUp design system as the main application.

Style:

- Minimal
- Clean
- Modern
- Professional
- Simple
- Spacious
- Easy to scan

Use:

- Clear typography
- Simple cards
- Subtle borders
- Small status badges
- Consistent buttons
- Clean tables

Avoid:

- Complex charts
- Large graphs
- Excessive colors
- Gradients
- Glassmorphism
- Decorative graphics
- Generic "enterprise admin dashboard" styling

The admin panel should feel like a **small, polished SaaS control panel**.

---

# 10. Dashboard Example

The dashboard can look approximately like:

**Dashboard**

Good morning, Faisal.

### Overview

[ 1,248 ]       [ 4,832 ]       [ 142 ]       [ 86 ]

Users           Bookings        Upcoming       Meeting Types


### Recent Activity

John Smith created an account                    5 min ago

Sarah created "Consultation"                     18 min ago

Mike received a new booking                      32 min ago

Jane cancelled a booking                         1 hr ago

Keep this section simple.

---

# 11. Responsive Design

The admin panel should work on:

- Desktop
- Tablet
- Mobile

Desktop is the primary experience.

On mobile:

- Collapse the sidebar
- Make tables horizontally scrollable or convert rows into cards
- Keep important actions accessible

---

# 12. Security

Admin security is important.

Implement:

- Server-side admin role checking
- Protected admin routes
- Protected admin server actions/API routes
- Supabase Row Level Security where appropriate

Normal users must never be able to retrieve:

- Other users' private information
- Admin data
- Google OAuth tokens
- Refresh tokens
- Private calendar information

Never expose Supabase service-role keys or Google OAuth secrets in client-side code.

---

# 13. Database

If the existing MeetUp database does not already have roles, add:

`profiles.role`

Values:

- `user`
- `admin`

Use a proper database migration.

Do not hardcode admin emails in the application.

For development, provide a clear way to assign an existing account the `admin` role.

---

# 14. Admin MVP — Final Scope

The entire admin panel should contain only:

### Dashboard
- Basic metrics
- Recent activity

### Users
- User list
- Search
- User details
- Suspend/reactivate

### Bookings
- Booking list
- Search
- Booking details

### Settings
- Basic app information
- Admin account

That's all.

---

# 15. Explicitly Do NOT Build

Do not build:

- Reports
- Abuse/moderation system
- System health dashboard
- Error monitoring
- Admin activity/audit log
- Revenue analytics
- Billing management
- Subscription management
- User impersonation
- Advanced analytics
- Charts
- Feature flags
- Support ticket system
- Organization management
- Team management
- Advanced permissions
- API management
- Email management
- Complex platform configuration
- Booking editing
- Booking rescheduling
- User deletion

These can be added later if MeetUp grows.

---

# 16. Final Requirement

Integrate this admin panel into the existing MeetUp application.

Reuse the existing:

- Supabase setup
- Authentication
- Database
- UI components
- Design system
- Typography
- Colors
- Navigation patterns

Do not create a separate application.

Before considering the admin panel complete, verify:

1. Normal users cannot access `/admin`
2. Admin users can access `/admin`
3. Dashboard metrics use real database data
4. Admin can search users
5. Admin can view user details
6. Admin can suspend/reactivate users
7. Admin can view bookings
8. Admin can search bookings
9. Admin can view booking details
10. Admin can access basic settings
11. Sensitive credentials are never exposed
12. Admin pages work properly on mobile

The goal is a **small, useful, polished admin panel — not a full administration platform.**