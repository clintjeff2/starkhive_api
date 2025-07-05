# Notification Templates

This directory contains Handlebars templates for notification delivery via email, SMS, and in-app channels.

## Usage

- **Email templates**: Use `.hbs` files for rich HTML emails.
- **SMS templates**: Use `.hbs` files for concise text messages.
- **In-app templates**: Use `.hbs` files for in-app notification formatting.

## Adding Templates

- Name templates according to the notification type and channel (e.g., `job-status-update-email.hbs`, `job-status-update-sms.hbs`).
- Use Handlebars syntax for dynamic content (e.g., `{{message}}`, `{{jobLink}}`).

## Example Variables

- `subject`, `title`, `message`, `jobLink`, etc.

## Rendering

Templates are rendered with the appropriate data in the notification service before delivery.
