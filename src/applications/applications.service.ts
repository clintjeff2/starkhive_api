// src/applications/applications.service.ts

import { NotificationsService, NotificationPayload } from '../notifications/notifications.service';
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Processes a job application and sends notification to the recruiter
   * Prevents duplicate applications (one per job per freelancer)
   * @param jobId The ID of the job being applied for
   * @param freelancerId The ID of the freelancer applying
   * @param recruiterId The ID of the recruiter to notify
   * @param coverLetter The cover letter/message
   * @returns The created application
   * @throws ConflictException if duplicate application exists
   */
  async applyForJob(
    jobId: string,
    freelancerId: string,
    recruiterId: string,
    coverLetter: string,
  ): Promise<Application> {
    if (!jobId || !freelancerId || !recruiterId || !coverLetter) {
      throw new ConflictException('All parameters (jobId, freelancerId, recruiterId, coverLetter) are required');
    }

    // Duplicate check
    const existing = await this.applicationRepository.findOne({ where: { jobId, freelancerId } });
    if (existing) {
      throw new ConflictException('You have already applied to this job.');
    }

    // Create and save application
    const application = this.applicationRepository.create({
      jobId,
      freelancerId,
      recruiterId,
      coverLetter,
    });
    await this.applicationRepository.save(application);

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
      // eslint-disable-next-line no-console
      console.error(`Failed to send notification for application ${application.id}:`, error);
    }

    return application;
  }

  async getApplicationsByUser(userId: string): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { user: { id: userId } }, // id is string here, matching entity
      relations: ['job'],
      order: { createdAt: 'DESC' },
    });
  }
  
}
