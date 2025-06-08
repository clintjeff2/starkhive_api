import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import type { Repository, SelectQueryBuilder } from "typeorm"
import { type Job, JobStatus } from "./entities/job.entity"
import type { CreateJobDto } from "./dto/create-job.dto"
import type { UpdateJobDto } from "./dto/update-job.dto"
import type { JobQueryDto } from "./dto/job-query.dto"
import { JobResponseDto, PaginatedJobResponseDto } from "./dto/job-response.dto"

@Injectable()
export class JobService {
  constructor(private readonly jobRepository: Repository<Job>) {}

  async create(createJobDto: CreateJobDto): Promise<JobResponseDto> {
    // Validate salary range
    if (createJobDto.salaryMin && createJobDto.salaryMax) {
      if (createJobDto.salaryMin > createJobDto.salaryMax) {
        throw new BadRequestException("Minimum salary cannot be greater than maximum salary")
      }
    }

    // Validate application deadline
    if (createJobDto.applicationDeadline) {
      const deadline = new Date(createJobDto.applicationDeadline)
      if (deadline <= new Date()) {
        throw new BadRequestException("Application deadline must be in the future")
      }
    }

    const job = this.jobRepository.create(createJobDto)
    const savedJob = await this.jobRepository.save(job)
    return new JobResponseDto(savedJob)
  }

  async findAll(queryDto: JobQueryDto): Promise<PaginatedJobResponseDto> {
    const {
      search,
      location,
      company,
      jobType,
      status,
      experienceLevel,
      salaryMin,
      salaryMax,
      isRemote,
      isUrgent,
      isFeatured,
      skills,
      sortBy,
      sortOrder,
      page,
      limit,
    } = queryDto

    const queryBuilder = this.jobRepository.createQueryBuilder("job")

    // Apply filters
    this.applyFilters(queryBuilder, {
      search,
      location,
      company,
      jobType,
      status,
      experienceLevel,
      salaryMin,
      salaryMax,
      isRemote,
      isUrgent,
      isFeatured,
      skills,
    })

    // Apply sorting
    const validSortFields = [
      "createdAt",
      "updatedAt",
      "title",
      "company",
      "salaryMin",
      "salaryMax",
      "viewCount",
      "applicationCount",
    ]

    if (validSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`job.${sortBy}`, sortOrder)
    } else {
      queryBuilder.orderBy("job.createdAt", "DESC")
    }

    // Apply pagination
    const skip = (page - 1) * limit
    queryBuilder.skip(skip).take(limit)

    const [jobs, total] = await queryBuilder.getManyAndCount()

    return new PaginatedJobResponseDto(jobs, total, page, limit)
  }

  async findOne(id: string): Promise<JobResponseDto> {
    const job = await this.jobRepository.findOne({ where: { id } })
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`)
    }
    return new JobResponseDto(job)
  }

  async update(id: string, updateJobDto: UpdateJobDto): Promise<JobResponseDto> {
    const job = await this.jobRepository.findOne({ where: { id } })
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`)
    }

    // Validate salary range if both values are provided
    const salaryMin = updateJobDto.salaryMin ?? job.salaryMin
    const salaryMax = updateJobDto.salaryMax ?? job.salaryMax

    if (salaryMin && salaryMax && salaryMin > salaryMax) {
      throw new BadRequestException("Minimum salary cannot be greater than maximum salary")
    }

    // Validate application deadline
    if (updateJobDto.applicationDeadline) {
      const deadline = new Date(updateJobDto.applicationDeadline)
      if (deadline <= new Date()) {
        throw new BadRequestException("Application deadline must be in the future")
      }
    }

    await this.jobRepository.update(id, updateJobDto)
    const updatedJob = await this.jobRepository.findOne({ where: { id } })
    return new JobResponseDto(updatedJob)
  }

  async remove(id: string): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { id } })
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`)
    }
    await this.jobRepository.remove(job)
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.jobRepository.increment({ id }, "viewCount", 1)
  }

  async incrementApplicationCount(id: string): Promise<void> {
    await this.jobRepository.increment({ id }, "applicationCount", 1)
  }

  async getJobStats(): Promise<any> {
    const totalJobs = await this.jobRepository.count()
    const activeJobs = await this.jobRepository.count({
      where: { status: JobStatus.ACTIVE },
    })
    const featuredJobs = await this.jobRepository.count({
      where: { isFeatured: true },
    })
    const remoteJobs = await this.jobRepository.count({
      where: { isRemote: true },
    })

    return {
      totalJobs,
      activeJobs,
      featuredJobs,
      remoteJobs,
    }
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<Job>, filters: any): void {
    const {
      search,
      location,
      company,
      jobType,
      status,
      experienceLevel,
      salaryMin,
      salaryMax,
      isRemote,
      isUrgent,
      isFeatured,
      skills,
    } = filters

    if (search) {
      queryBuilder.andWhere("(job.title ILIKE :search OR job.description ILIKE :search OR job.company ILIKE :search)", {
        search: `%${search}%`,
      })
    }

    if (location) {
      queryBuilder.andWhere("job.location ILIKE :location", {
        location: `%${location}%`,
      })
    }

    if (company) {
      queryBuilder.andWhere("job.company ILIKE :company", {
        company: `%${company}%`,
      })
    }

    if (jobType) {
      queryBuilder.andWhere("job.jobType = :jobType", { jobType })
    }

    if (status) {
      queryBuilder.andWhere("job.status = :status", { status })
    }

    if (experienceLevel) {
      queryBuilder.andWhere("job.experienceLevel = :experienceLevel", {
        experienceLevel,
      })
    }

    if (salaryMin) {
      queryBuilder.andWhere("job.salaryMax >= :salaryMin", { salaryMin })
    }

    if (salaryMax) {
      queryBuilder.andWhere("job.salaryMin <= :salaryMax", { salaryMax })
    }

    if (isRemote !== undefined) {
      queryBuilder.andWhere("job.isRemote = :isRemote", { isRemote })
    }

    if (isUrgent !== undefined) {
      queryBuilder.andWhere("job.isUrgent = :isUrgent", { isUrgent })
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere("job.isFeatured = :isFeatured", { isFeatured })
    }

    if (skills) {
      const skillsArray = skills.split(",").map((skill) => skill.trim())
      queryBuilder.andWhere("job.skills && :skills", { skills: skillsArray })
    }
  }
}
