import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { Freelancer } from '../entities/freelancer.entity';
import { MatchingHistory } from '../entities/matching-history.entity';
import { MatchingPreferences } from '../entities/matching-preferences.entity';
import { JobRecommendationResponseDto } from '../dto/job-recommendation.dto';

interface MatchingScore {
  totalScore: number;
  breakdown: {
    skillsScore: number;
    experienceScore: number;
    budgetScore: number;
    categoryScore: number;
    availabilityScore: number;
  };
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private jobRepository: Repository<Job>,
    private freelancerRepository: Repository<Freelancer>,
    private matchingHistoryRepository: Repository<MatchingHistory>,
    private preferencesRepository: Repository<MatchingPreferences>,
  ) {}

  async getJobRecommendations(
    freelancerId: string,
    limit: number = 10,
    offset: number = 0,
    categories?: string[],
    minScore: number = 50,
  ): Promise<JobRecommendationResponseDto[]> {
    const freelancer = await this.freelancerRepository.findOne({
      where: { id: freelancerId },
      relations: ['preferences'],
    });

    if (!freelancer) {
      throw new Error('Freelancer not found');
    }

    // Get active jobs
    let jobsQuery = this.jobRepository
      .createQueryBuilder('job')
      .where('job.isActive = :isActive', { isActive: true });

    // Apply category filters
    if (categories && categories.length > 0) {
      jobsQuery = jobsQuery.andWhere('job.category IN (:...categories)', { categories });
    } else if (freelancer.preferences?.preferredCategories?.length > 0) {
      jobsQuery = jobsQuery.andWhere('job.category IN (:...preferredCategories)', {
        preferredCategories: freelancer.preferences.preferredCategories,
      });
    }

    // Exclude categories from preferences
    if (freelancer.preferences?.excludedCategories?.length > 0) {
      jobsQuery = jobsQuery.andWhere('job.category NOT IN (:...excludedCategories)', {
        excludedCategories: freelancer.preferences.excludedCategories,
      });
    }

    // Apply budget filters
    if (freelancer.preferences?.minBudget) {
      jobsQuery = jobsQuery.andWhere('job.budget >= :minBudget', {
        minBudget: freelancer.preferences.minBudget,
      });
    }

    if (freelancer.preferences?.maxBudget) {
      jobsQuery = jobsQuery.andWhere('job.budget <= :maxBudget', {
        maxBudget: freelancer.preferences.maxBudget,
      });
    }

    const jobs = await jobsQuery.getMany();

    // Calculate matching scores for each job
    const jobsWithScores = await Promise.all(
      jobs.map(async (job) => {
        const matchingScore = this.calculateMatchingScore(freelancer, job);
        
        // Store matching history
        await this.storeMatchingHistory(freelancer.id, job.id, matchingScore);

        return {
          ...job,
          matchingScore: matchingScore.totalScore,
          scoreBreakdown: matchingScore.breakdown,
        };
      }),
    );

    // Filter by minimum score and sort by matching score
    const filteredJobs = jobsWithScores
      .filter((job) => job.matchingScore >= minScore)
      .sort((a, b) => b.matchingScore - a.matchingScore)
      .slice(offset, offset + limit);

    return filteredJobs.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      experienceLevel: job.experienceLevel,
      budget: job.budget,
      duration: job.duration,
      category: job.category,
      clientId: job.clientId,
      matchingScore: job.matchingScore,
      scoreBreakdown: job.scoreBreakdown,
      createdAt: job.createdAt,
    }));
  }

  private calculateMatchingScore(freelancer: Freelancer, job: Job): MatchingScore {
    const weights = {
      skills: 0.4,
      experience: 0.25,
      budget: 0.15,
      category: 0.1,
      availability: 0.1,
    };

    const skillsScore = this.calculateSkillsScore(freelancer.skills, job.requiredSkills, job.preferredSkills);
    const experienceScore = this.calculateExperienceScore(freelancer.experienceLevel, job.experienceLevel);
    const budgetScore = this.calculateBudgetScore(freelancer.hourlyRate, job.budget);
    const categoryScore = this.calculateCategoryScore(freelancer.categories, job.category);
    const availabilityScore = freelancer.isAvailable ? 100 : 0;

    const totalScore = Math.round(
      skillsScore * weights.skills +
      experienceScore * weights.experience +
      budgetScore * weights.budget +
      categoryScore * weights.category +
      availabilityScore * weights.availability
    );

    return {
      totalScore,
      breakdown: {
        skillsScore: Math.round(skillsScore),
        experienceScore: Math.round(experienceScore),
        budgetScore: Math.round(budgetScore),
        categoryScore: Math.round(categoryScore),
        availabilityScore: Math.round(availabilityScore),
      },
    };
  }

  private calculateSkillsScore(
    freelancerSkills: string[],
    requiredSkills: string[],
    preferredSkills: string[] = [],
  ): number {
    if (!freelancerSkills || freelancerSkills.length === 0) return 0;

    const normalizedFreelancerSkills = freelancerSkills.map(skill => skill.toLowerCase());
    const normalizedRequiredSkills = requiredSkills.map(skill => skill.toLowerCase());
    const normalizedPreferredSkills = preferredSkills.map(skill => skill.toLowerCase());

    // Calculate required skills match (weighted more heavily)
    const requiredMatches = normalizedRequiredSkills.filter(skill =>
      normalizedFreelancerSkills.includes(skill)
    ).length;
    const requiredScore = requiredSkills.length > 0 ? (requiredMatches / requiredSkills.length) * 100 : 100;

    // Calculate preferred skills match (bonus points)
    const preferredMatches = normalizedPreferredSkills.filter(skill =>
      normalizedFreelancerSkills.includes(skill)
    ).length;
    const preferredBonus = preferredSkills.length > 0 ? (preferredMatches / preferredSkills.length) * 20 : 0;

    return Math.min(100, requiredScore + preferredBonus);
  }

  private calculateExperienceScore(freelancerLevel: string, jobLevel: string): number {
    const experienceLevels = { junior: 1, mid: 2, senior: 3 };
    const freelancerExp = experienceLevels[freelancerLevel.toLowerCase()] || 1;
    const jobExp = experienceLevels[jobLevel.toLowerCase()] || 1;

    if (freelancerExp === jobExp) return 100;
    if (freelancerExp > jobExp) return 90; // Overqualified but still good
    if (freelancerExp === jobExp - 1) return 70; // Slightly underqualified
    return 40; // Significantly underqualified
  }

  private calculateBudgetScore(freelancerRate: number, jobBudget: number): number {
    if (!freelancerRate || !jobBudget) return 50; // Neutral score if no rate info

    // Assume job budget is for the entire project, estimate hours
    const estimatedHours = 40; // Default assumption
    const maxHourlyFromBudget = jobBudget / estimatedHours;

    if (freelancerRate <= maxHourlyFromBudget) return 100;
    if (freelancerRate <= maxHourlyFromBudget * 1.2) return 80;
    if (freelancerRate <= maxHourlyFromBudget * 1.5) return 60;
    return 30;
  }

  private calculateCategoryScore(freelancerCategories: string[], jobCategory: string): number {
    if (!freelancerCategories || freelancerCategories.length === 0) return 50;
    
    const normalizedFreelancerCategories = freelancerCategories.map(cat => cat.toLowerCase());
    const normalizedJobCategory = jobCategory.toLowerCase();

    return normalizedFreelancerCategories.includes(normalizedJobCategory) ? 100 : 30;
  }

  private async storeMatchingHistory(
    freelancerId: string,
    jobId: string,
    matchingScore: MatchingScore,
  ): Promise<void> {
    try {
      // Check if history already exists for this combination
      const existingHistory = await this.matchingHistoryRepository.findOne({
        where: { freelancerId, jobId },
      });

      if (!existingHistory) {
        const history = this.matchingHistoryRepository.create({
          freelancerId,
          jobId,
          matchingScore: matchingScore.totalScore,
          scoreBreakdown: matchingScore.breakdown,
        });

        await this.matchingHistoryRepository.save(history);
      }
    } catch (error) {
      this.logger.error(`Failed to store matching history: ${error.message}`);
    }
  }

  async updateMatchingAction(
    freelancerId: string,
    jobId: string,
    action: 'viewed' | 'applied' | 'ignored',
  ): Promise<void> {
    await this.matchingHistoryRepository.update(
      { freelancerId, jobId },
      { action },
    );
  }

  async getMatchingHistory(
    freelancerId: string,
    limit: number = 50,
  ): Promise<MatchingHistory[]> {
    return this.matchingHistoryRepository.find({
      where: { freelancerId },
      relations: ['job'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}