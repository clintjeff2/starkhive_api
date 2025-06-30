import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from '../jobs.controller';
import { JobsService } from '../jobs.service';

describe('JobsController', () => {
  let controller: JobsController;
  let service: JobsService;

  const mockUser = { id: 'user-1', email: 'test@example.com', password: 'pass', role: 'RECRUITER' } as any;

  const mockJobsService = {
    toggleSaveJob: jest.fn(),
    getSavedJobs: jest.fn(),
    isJobSaved: jest.fn(),
    updateJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  describe('toggleSaveJob', () => {
    it('should toggle save status of a job', async () => {
      const jobId = 1;
      const expectedResult = { saved: true };
      mockJobsService.toggleSaveJob.mockResolvedValue(expectedResult);

      const result = await controller.toggleSaveJob(jobId, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.toggleSaveJob).toHaveBeenCalledWith(jobId, 'user-1');
    });

    it('should use default user ID when not authenticated', async () => {
      const jobId = 1;
      const expectedResult = { saved: true };
      mockJobsService.toggleSaveJob.mockResolvedValue(expectedResult);

      const result = await controller.toggleSaveJob(jobId, { id: '1' } as any);

      expect(result).toEqual(expectedResult);
      expect(service.toggleSaveJob).toHaveBeenCalledWith(jobId, '1');
    });
  });

  describe('getSavedJobs', () => {
    it('should return all saved jobs for authenticated user', async () => {
      const expectedJobs = [{ id: 1, title: 'Test Job' }];
      mockJobsService.getSavedJobs.mockResolvedValue(expectedJobs);

      const result = await controller.getSavedJobs(mockUser);

      expect(result).toEqual(expectedJobs);
      expect(service.getSavedJobs).toHaveBeenCalledWith('user-1');
    });

    it('should use default user ID when not authenticated', async () => {
      const expectedJobs = [{ id: 1, title: 'Test Job' }];
      mockJobsService.getSavedJobs.mockResolvedValue(expectedJobs);

      const result = await controller.getSavedJobs({ id: '1' } as any);

      expect(result).toEqual(expectedJobs);
      expect(service.getSavedJobs).toHaveBeenCalledWith('1');
    });
  });

  describe('isJobSaved', () => {
    it('should check if job is saved for authenticated user', async () => {
      const jobId = 1;
      const expectedResult = true;
      mockJobsService.isJobSaved.mockResolvedValue(expectedResult);

      const result = await controller.isJobSaved(jobId, mockUser);

      expect(result).toBe(expectedResult);
      expect(service.isJobSaved).toHaveBeenCalledWith(jobId, 'user-1');
    });

    it('should use default user ID when not authenticated', async () => {
      const jobId = 1;
      const expectedResult = false;
      mockJobsService.isJobSaved.mockResolvedValue(expectedResult);

      const result = await controller.isJobSaved(jobId, { id: '1' } as any);

      expect(result).toBe(expectedResult);
      expect(service.isJobSaved).toHaveBeenCalledWith(jobId, '1');
    });
  });

  describe('updateJob', () => {
    it('should update a job if user is the recruiter', async () => {
      const jobId = 1;
      const updateJobDto = { title: 'Updated Title' };
      const user = { id: 'user-1' };
      const expectedJob = { id: jobId, title: 'Updated Title' };
      mockJobsService.updateJob = jest.fn().mockResolvedValue(expectedJob);

      const result = await controller.updateJob(jobId, updateJobDto, user as any);
      expect(result).toEqual(expectedJob);
      expect(mockJobsService.updateJob).toHaveBeenCalledWith(jobId, updateJobDto, user.id);
    });

    it('should throw ForbiddenException if user is not the recruiter', async () => {
      const jobId = 1;
      const updateJobDto = { title: 'Updated Title' };
      const user = { id: 'user-2' };
      const forbiddenError = { status: 403, message: 'Only the job owner can update this job' };
      mockJobsService.updateJob = jest.fn().mockRejectedValue(forbiddenError);

      await expect(controller.updateJob(jobId, updateJobDto, user as any)).rejects.toEqual(forbiddenError);
      expect(mockJobsService.updateJob).toHaveBeenCalledWith(jobId, updateJobDto, user.id);
    });
  });
});
