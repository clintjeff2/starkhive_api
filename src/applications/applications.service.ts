// src/applications/applications.service.ts

import { NotificationsService, NotificationPayload } from '../notifications/notifications.service';

export interface Application {
  id: string;
  jobId: string;
  freelancerId: string;
  recruiterId: string;
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class ApplicationsService {
  private applications: Application[] = [];

  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Processes a job application and sends notification to the recruiter
   * @param jobId The ID of the job being applied for
   * @param freelancerId The ID of the freelancer applying
   * @param recruiterId The ID of the recruiter to notify
   * @returns The created application
   * @throws Error if application processing fails
   */
  async applyForJob(
    jobId: string,
    freelancerId: string,
    recruiterId: string,
  ): Promise<Application> {
    // Input validation
    if (!jobId || !freelancerId || !recruiterId) {
      throw new Error('All parameters (jobId, freelancerId, recruiterId) are required');
    }

    const application: Application = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      freelancerId,
      recruiterId,
    };
    this.applications.push(application);

    // Build links (replace with your actual URL structure)
    const jobLink = `/jobs/${jobId}`;
    const freelancerProfileLink = `/freelancers/${freelancerId}`;

    try {
      // Send notification to recruiter
      const notificationPayload: NotificationPayload = {
        recruiterId,
        jobId,
        freelancerId,
        jobLink,
        freelancerProfileLink,
      };
      await this.notificationsService.sendNotification(notificationPayload);
    } catch (error) {
      // Log error but don't fail the application creation
      // Consider implementing a retry mechanism or dead letter queue
      // eslint-disable-next-line no-console
      console.error(`Failed to send notification for application ${application.id}:`, error);
    }

    return application;
  }
}
