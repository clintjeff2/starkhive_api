// src/notifications/notifications.service.ts

export interface NotificationPayload {
  recruiterId: string;
  jobId: string;
  freelancerId: string;
  jobLink: string;
  freelancerProfileLink: string;
}

export class NotificationsService {
  // Simulate sending a notification (replace with real implementation)
  async sendNotification(payload: NotificationPayload): Promise<void> {
    // Here you would integrate with your real notification system
    console.log(`Notification sent to recruiter ${payload.recruiterId}:`);
    console.log(`Freelancer applied for job.`);
    console.log(`Job link: ${payload.jobLink}`);
    console.log(`Freelancer profile: ${payload.freelancerProfileLink}`);
  }
}
