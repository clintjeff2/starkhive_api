# StarkHive API

Welcome to the **StarkHive API** – the backend service powering StarkHive, a decentralized Web3 job marketplace built on Starknet. This platform connects freelancers and recruiters through a LinkedIn-style feed and Upwork-style job interactions, tailored for the blockchain and developer community.

## 🚀 Tech Stack

* **Framework**: [NestJS](https://nestjs.com/) (TypeScript)
* **ORM**: [TypeORM](https://typeorm.io/)
* **Database**: PostgreSQL

## 🛠 Features Overview

* 🔐 Auth (JWT, refresh tokens, RBAC)
* 🧑‍💻 Freelancer & Recruiter onboarding
* 💼 Job Posting and Applications
* 📰 Social Feed with likes, comments, and saves
* 🛡️ Admin tools for moderation
* 📬 Notifications
* 📁 Portfolios & Profiles
* 💬 Messaging (initial structure)

## 📦 Project Structure

```
src/
├── auth/            → user registration, login, roles, profiles
├── jobs/            → job creation, applications, status
├── feed/            → posts, likes, comments, reports
├── notifications/   → user alerts, preferences
├── applications/    → job applications
├── messaging/       → direct messages
├── anti-spam/       → spam detection & flagging
├── reviews/         → freelancer reviews
```

## 💡 Getting Started

```bash
git clone https://github.com/your-org/StarkHive_api.git
cd StarkHive_api
npm install
npm run start:dev
```

* Copy `.env.example` to `.env` and fill in your config. Add your `.env` to `.gitignore`.
* Ensure PostgreSQL is running.

## 📋 Contribution Guide

We're building this together. Here's how to contribute:

### 👇 To work on an issue:

1. Browse the open [Issues](https://github.com/your-org/StarkHive_api/issues).
2. Choose an issue (look for ones without an assignee).
3. **Comment** on the issue with: `Maintainers, I would like to work on this issue, with an estimated ETA.`
4. **Wait for assignment.** (Please don't create PRs without assignment.)

### ✅ After assignment:

* Fork the repo.
* Create a branch: `git checkout -b feat/your-feature-name`
* Code and make sure to test your changes.
* Submit a PR that includes `Close #ISSUE_NUMBER` in the description.

### 🤝 Rules Before Starting:

* Always wait for a maintainer to assign the issue.
* **Join our [Telegram Group](https://t.me/+qiMcjw-uGDAwYTQ0)** for questions, collabs, or help.
* **⭐ Star the repo** if you find this project valuable.

## 📄 License

MIT

---

Built with 💙 by the StarkHive community

## 🔔 Advanced Notification System

The notification system supports in-app, email, and SMS delivery for critical events, with advanced user preferences and delivery tracking.

### Features
- **Email notifications** for critical events (via SMTP)
- **SMS notifications** for urgent alerts (via Twilio)
- **In-app notifications** for all users
- **Rich templates** for email/SMS/in-app (Handlebars-based)
- **User preferences**: per-channel, per-type, frequency
- **Delivery status tracking** for all channels

### Configuration
Add the following to your `.env`:

#### SMTP (Email)
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=noreply@starkhive.com
```

#### Twilio (SMS)
```
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM=+1234567890
```

### Templates
- Email/SMS templates are in `src/notifications/templates/` (Handlebars format)
- Add or modify templates as needed for new notification types

### Preferences
- Users can set preferences for each notification type (application, reviews, posts, tasks)
- Preferences include channel (in-app, email, SMS) and frequency (immediate, daily, etc.)

### Delivery Tracking
- All notification deliveries are tracked in the database with status (sent, failed, delivered, read)

### Testing
- **Unit tests**: `src/notifications/notifications.service.spec.ts`
- **E2E tests**: `test/notifications.e2e-spec.ts`
- Run all tests:
  ```bash
  npm run test
  npm run test:e2e
  ```