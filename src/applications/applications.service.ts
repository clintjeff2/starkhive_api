// src/applications/applications.service.ts

import { NotificationsService, NotificationPayload } from '../notifications/notifications.service';

export interface Application {
  id: string;
  jobId: string;
  freelancerId: string;
  recruiterId: string;
}

export class ApplicationsService {
  private notificationsService: NotificationsService;
  private applications: Application[] = [];

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  // Simulate applying for a job
  async applyForJob(jobId: string, freelancerId: string, recruiterId: string): Promise<Application> {
    const application: Application = {
      id: `${Date.now()}`,
      jobId,
      freelancerId,
      recruiterId,
    };
    this.applications.push(application);

    // Build links (replace with your actual URL structure)
    const jobLink = `/jobs/${jobId}`;
    const freelancerProfileLink = `/freelancers/${freelancerId}`;

    // Send notification to recruiter
    const notificationPayload: NotificationPayload = {
      recruiterId,
      jobId,
      freelancerId,
      jobLink,
      freelancerProfileLink,
    };
    await this.notificationsService.sendNotification(notificationPayload);

    return application;
  }
}
