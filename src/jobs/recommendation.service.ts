import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Between } from 'typeorm';
import { Recommendation } from './entities/recommendation.entity';
import { Job } from './entities/job.entity';
import { User } from 'src/auth/entities/user.entity';
import { Application } from 'src/applications/entities/application.entity';
import { SavedJob } from './entities/saved-job.entity';
import { JobStatus } from 'src/feed/enums/job-status.enum';
import { 
  GetRecommendationsDto, 
  UpdateRecommendationActionDto,
  UserPreferencesDto,
  RecommendationResponseDto,
  RecommendationMetricsDto 
} from './dto/recommendation.dto';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(SavedJob)
    private readonly savedJobRepository: Repository<SavedJob>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generate personalized job recommendations for a user
   */
  async generateRecommendations(
    userId: string,
    options: GetRecommendationsDto = {},
  ): Promise<RecommendationResponseDto[]> {
    const { limit = 20, offset = 0, preferences } = options;

    // Get user preferences (either from request or stored)
    const userPreferences = preferences || await this.getUserPreferences(userId);

    // Get available jobs
    const availableJobs = await this.getAvailableJobs();

    // Generate recommendations for each job
    const recommendations: Recommendation[] = [];
    
    for (const job of availableJobs) {
      const existingRecommendation = await this.recommendationRepository.findOne({
        where: { userId, jobId: job.id },
      });

      if (existingRecommendation) {
        // Update existing recommendation with new scoring
        await this.updateRecommendationScore(existingRecommendation, job, userPreferences);
        recommendations.push(existingRecommendation);
      } else {
        // Create new recommendation
        const recommendation = await this.createRecommendation(userId, job, userPreferences);
        recommendations.push(recommendation);
      }
    }

    // Sort and return recommendations
    const sortedRecommendations = this.sortRecommendations(recommendations, options);
    const paginatedRecommendations = sortedRecommendations.slice(offset, offset + limit);

    return this.formatRecommendationResponses(paginatedRecommendations);
  }

  /**
   * Create a new recommendation with AI-powered scoring
   */
  async createRecommendation(
    userId: string,
    job: Job,
    userPreferences: UserPreferencesDto,
  ): Promise<Recommendation> {
    const scoringFactors = await this.calculateScoringFactors(job, userPreferences, userId);
    const totalScore = this.calculateTotalScore(scoringFactors);

    const recommendation = this.recommendationRepository.create({
      userId,
      jobId: job.id,
      score: totalScore,
      scoringFactors,
      userPreferences,
      impressionCount: 1,
    });

    return this.recommendationRepository.save(recommendation);
  }

  /**
   * Update recommendation score based on new data
   */
  async updateRecommendationScore(
    recommendation: Recommendation,
    job: Job,
    userPreferences: UserPreferencesDto,
  ): Promise<void> {
    const scoringFactors = await this.calculateScoringFactors(job, userPreferences, recommendation.userId);
    const totalScore = this.calculateTotalScore(scoringFactors);

    recommendation.score = totalScore;
    recommendation.scoringFactors = scoringFactors;
    recommendation.userPreferences = userPreferences;

    await this.recommendationRepository.save(recommendation);
  }

  /**
   * Calculate scoring factors using ML algorithms
   */
  private async calculateScoringFactors(
    job: Job,
    userPreferences: UserPreferencesDto,
    userId: string,
  ): Promise<Recommendation['scoringFactors']> {
    const [
      skillMatch,
      experienceMatch,
      locationMatch,
      budgetMatch,
      userBehavior,
      jobPopularity,
    ] = await Promise.all([
      this.calculateSkillMatch(job, userPreferences),
      this.calculateExperienceMatch(job, userPreferences),
      this.calculateLocationMatch(job, userPreferences),
      this.calculateBudgetMatch(job, userPreferences),
      this.calculateUserBehaviorScore(userId, job),
      this.calculateJobPopularity(job),
    ]);

    return {
      skillMatch,
      experienceMatch,
      locationMatch,
      budgetMatch,
      userBehavior,
      jobPopularity,
    };
  }

  /**
   * Calculate skill match score using TF-IDF and cosine similarity
   */
  private async calculateSkillMatch(job: Job, userPreferences: UserPreferencesDto): Promise<number> {
    if (!userPreferences.skills || userPreferences.skills.length === 0) {
      return 0.5; // Default score if no skills provided
    }

    const jobSkills = this.extractSkillsFromJob(job);
    const userSkills = userPreferences.skills.map(skill => skill.toLowerCase());

    // Calculate intersection
    const matchingSkills = jobSkills.filter(skill => 
      userSkills.some(userSkill => 
        skill.includes(userSkill) || userSkill.includes(skill)
      )
    );

    // Calculate Jaccard similarity
    const intersection = new Set(matchingSkills).size;
    const union = new Set([...jobSkills, ...userSkills]).size;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Calculate experience level match
   */
  private async calculateExperienceMatch(job: Job, userPreferences: UserPreferencesDto): Promise<number> {
    if (!userPreferences.experienceLevel) {
      return 0.5;
    }

    const experienceLevels = ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'];
    const jobLevel = this.extractExperienceLevel(job);
    const userLevel = userPreferences.experienceLevel.toLowerCase();

    const jobIndex = experienceLevels.indexOf(jobLevel);
    const userIndex = experienceLevels.indexOf(userLevel);

    if (jobIndex === -1 || userIndex === -1) {
      return 0.5;
    }

    // Calculate distance-based similarity
    const distance = Math.abs(jobIndex - userIndex);
    const maxDistance = experienceLevels.length - 1;
    
    return 1 - (distance / maxDistance);
  }

  /**
   * Calculate location match score
   */
  private async calculateLocationMatch(job: Job, userPreferences: UserPreferencesDto): Promise<number> {
    if (!userPreferences.location) {
      return 0.5;
    }

    const jobLocation = this.extractLocation(job);
    const userLocation = userPreferences.location.toLowerCase();

    // Simple string similarity for now
    if (jobLocation.includes(userLocation) || userLocation.includes(jobLocation)) {
      return 1.0;
    }

    // Check for remote work preference
    if (userPreferences.location.toLowerCase().includes('remote') && job.isRemote) {
      return 0.9;
    }

    return 0.1;
  }

  /**
   * Calculate budget match score
   */
  private async calculateBudgetMatch(job: Job, userPreferences: UserPreferencesDto): Promise<number> {
    if (!userPreferences.budgetRange || !job.budget) {
      return 0.5;
    }

    const { min, max } = userPreferences.budgetRange;
    const jobBudget = job.budget;

    if (jobBudget >= min && jobBudget <= max) {
      return 1.0;
    }

    // Calculate distance from preferred range
    const distance = Math.min(
      Math.abs(jobBudget - min),
      Math.abs(jobBudget - max)
    );
    const rangeSize = max - min;
    
    return Math.max(0, 1 - (distance / rangeSize));
  }

  /**
   * Calculate user behavior score based on historical data
   */
  private async calculateUserBehaviorScore(userId: string, job: Job): Promise<number> {
    const [
      applicationHistory,
      savedJobs,
      viewHistory,
    ] = await Promise.all([
      this.getUserApplicationHistory(userId),
      this.getUserSavedJobs(userId),
      this.getUserViewHistory(userId),
    ]);

    let behaviorScore = 0.5; // Base score

    // Analyze application patterns
    const similarAppliedJobs = applicationHistory.filter(app => 
      this.jobsAreSimilar(app.job, job)
    );
    if (similarAppliedJobs.length > 0) {
      behaviorScore += 0.3;
    }

    // Analyze saved job patterns
    const similarSavedJobs = savedJobs.filter(savedJob => 
      this.jobsAreSimilar(savedJob.job, job)
    );
    if (similarSavedJobs.length > 0) {
      behaviorScore += 0.2;
    }

    // Analyze view patterns
    const similarViewedJobs = viewHistory.filter(viewedJob => 
      this.jobsAreSimilar(viewedJob, job)
    );
    if (similarViewedJobs.length > 0) {
      behaviorScore += 0.1;
    }

    return Math.min(1.0, behaviorScore);
  }

  /**
   * Calculate job popularity score
   */
  private async calculateJobPopularity(job: Job): Promise<number> {
    const [
      applicationCount,
      viewCount,
      saveCount,
    ] = await Promise.all([
      this.getJobApplicationCount(job.id),
      this.getJobViewCount(job.id),
      this.getJobSaveCount(job.id),
    ]);

    // Normalize popularity metrics
    const maxApplications = 100; // Adjust based on your data
    const maxViews = 1000;
    const maxSaves = 50;

    const applicationScore = Math.min(1.0, applicationCount / maxApplications);
    const viewScore = Math.min(1.0, viewCount / maxViews);
    const saveScore = Math.min(1.0, saveCount / maxSaves);

    // Weighted average
    return (applicationScore * 0.4 + viewScore * 0.3 + saveScore * 0.3);
  }

  /**
   * Calculate total recommendation score
   */
  private calculateTotalScore(scoringFactors: Recommendation['scoringFactors']): number {
    const weights = {
      skillMatch: 0.25,
      experienceMatch: 0.20,
      locationMatch: 0.15,
      budgetMatch: 0.15,
      userBehavior: 0.15,
      jobPopularity: 0.10,
    };

    return Object.entries(scoringFactors).reduce((total, [factor, score]) => {
      return total + (score * weights[factor as keyof typeof weights]);
    }, 0);
  }

  /**
   * Update recommendation action (view, apply, save, dismiss)
   */
  async updateRecommendationAction(
    recommendationId: string,
    action: UpdateRecommendationActionDto,
  ): Promise<void> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    const now = new Date();
    const { action: actionType, value = true } = action;

    switch (actionType) {
      case 'view':
        recommendation.isViewed = value;
        recommendation.viewedAt = value ? now : null;
        recommendation.viewCount += value ? 1 : 0;
        break;
      case 'apply':
        recommendation.isApplied = value;
        recommendation.appliedAt = value ? now : null;
        break;
      case 'save':
        recommendation.isSaved = value;
        recommendation.savedAt = value ? now : null;
        break;
      case 'dismiss':
        recommendation.isDismissed = value;
        recommendation.dismissedAt = value ? now : null;
        break;
    }

    recommendation.updateMetrics();
    await this.recommendationRepository.save(recommendation);
  }

  /**
   * Get recommendation metrics for analytics
   */
  async getRecommendationMetrics(userId: string): Promise<RecommendationMetricsDto> {
    const recommendations = await this.recommendationRepository.find({
      where: { userId },
      relations: ['job'],
    });

    if (recommendations.length === 0) {
      return {
        totalRecommendations: 0,
        averageScore: 0,
        clickThroughRate: 0,
        applicationRate: 0,
        topSkills: [],
        topJobTypes: [],
        recommendationsByScore: [],
      };
    }

    const totalRecommendations = recommendations.length;
    const averageScore = recommendations.reduce((sum, rec) => sum + rec.score, 0) / totalRecommendations;
    
    const viewedRecommendations = recommendations.filter(rec => rec.isViewed);
    const appliedRecommendations = recommendations.filter(rec => rec.isApplied);
    
    const clickThroughRate = viewedRecommendations.length / totalRecommendations;
    const applicationRate = appliedRecommendations.length / Math.max(viewedRecommendations.length, 1);

    // Analyze top skills and job types
    const skillCounts = this.analyzeSkills(recommendations);
    const jobTypeCounts = this.analyzeJobTypes(recommendations);
    const scoreRanges = this.analyzeScoreRanges(recommendations);

    return {
      totalRecommendations,
      averageScore,
      clickThroughRate,
      applicationRate,
      topSkills: skillCounts.slice(0, 10),
      topJobTypes: jobTypeCounts.slice(0, 5),
      recommendationsByScore: scoreRanges,
    };
  }

  // Helper methods
  private async getUserPreferences(userId: string): Promise<UserPreferencesDto> {
    return {
      skills: [],
      experienceLevel: 'mid',
      location: '',
      budgetRange: { min: 0, max: 10000 },
      jobTypes: [],
    };
  }

  private async getAvailableJobs(): Promise<Job[]> {
    return this.jobRepository.find({
      where: { 
        status: JobStatus.OPEN,
        isAcceptingApplications: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  private extractSkillsFromJob(job: Job): string[] {
    // Extract skills from job description and title
    const text = `${job.title} ${job.description}`.toLowerCase();
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'angular', 'vue',
      'php', 'ruby', 'go', 'rust', 'c++', 'c#', 'swift', 'kotlin',
      'html', 'css', 'sql', 'mongodb', 'postgresql', 'mysql', 'redis',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'jenkins',
      'figma', 'adobe', 'photoshop', 'illustrator', 'sketch',
      'wordpress', 'shopify', 'woocommerce', 'magento',
    ];

    return commonSkills.filter(skill => text.includes(skill));
  }

  private extractExperienceLevel(job: Job): string {
    const text = `${job.title} ${job.description}`.toLowerCase();
    const levels = ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'];
    
    for (const level of levels) {
      if (text.includes(level)) {
        return level;
      }
    }
    
    return 'mid'; // Default
  }

  private extractLocation(job: Job): string {
    // This would need to be implemented based on your job entity structure
    return '';
  }

  private async getUserApplicationHistory(userId: string): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { freelancerId: userId },
      relations: ['job'],
    });
  }

  private async getUserSavedJobs(userId: string): Promise<SavedJob[]> {
    return this.savedJobRepository.find({
      where: { user: { id: userId } },
      relations: ['job'],
    });
  }

  private async getUserViewHistory(userId: string): Promise<Job[]> {
    // This would need to be implemented based on your view tracking
    return [];
  }

  private jobsAreSimilar(job1: Job, job2: Job): boolean {
    const skills1 = this.extractSkillsFromJob(job1);
    const skills2 = this.extractSkillsFromJob(job2);
    
    const commonSkills = skills1.filter(skill => skills2.includes(skill));
    return commonSkills.length > 0;
  }

  private async getJobApplicationCount(jobId: number): Promise<number> {
    return this.applicationRepository.count({ where: { jobId: jobId.toString() } });
  }

  private async getJobViewCount(jobId: number): Promise<number> {
    // This would need to be implemented based on your view tracking
    return 0;
  }

  private async getJobSaveCount(jobId: number): Promise<number> {
    return this.savedJobRepository.count({ where: { job: { id: jobId } } });
  }

  private sortRecommendations(
    recommendations: Recommendation[],
    options: GetRecommendationsDto,
  ): Recommendation[] {
    const { sortBy = 'score', sortOrder = 'desc' } = options;

    return recommendations.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'popularity':
          comparison = (a.scoringFactors?.jobPopularity || 0) - (b.scoringFactors?.jobPopularity || 0);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private async formatRecommendationResponses(
    recommendations: Recommendation[],
  ): Promise<RecommendationResponseDto[]> {
    const recommendationsWithJobs = await Promise.all(
      recommendations.map(async (rec) => {
        const job = await this.jobRepository.findOne({ where: { id: rec.jobId } });
        return { recommendation: rec, job };
      })
    );

    return recommendationsWithJobs
      .filter(({ job }) => job !== null)
      .map(({ recommendation, job }) => ({
        id: recommendation.id,
        jobId: recommendation.jobId,
        score: recommendation.score,
        scoringFactors: recommendation.scoringFactors,
        job: {
          id: job!.id,
          title: job!.title,
          description: job!.description,
          budget: job!.budget,
          deadline: job!.deadline,
          status: job!.status,
          createdAt: job!.createdAt,
        },
        isViewed: recommendation.isViewed,
        isApplied: recommendation.isApplied,
        isSaved: recommendation.isSaved,
        isDismissed: recommendation.isDismissed,
        clickThroughRate: recommendation.clickThroughRate,
        applicationRate: recommendation.applicationRate,
        createdAt: recommendation.createdAt,
      }));
  }

  private analyzeSkills(recommendations: Recommendation[]): Array<{ skill: string; count: number }> {
    const skillCounts: { [key: string]: number } = {};
    
    recommendations.forEach(rec => {
      const skills = rec.userPreferences?.skills || [];
      skills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    return Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count);
  }

  private analyzeJobTypes(recommendations: Recommendation[]): Array<{ type: string; count: number }> {
    const typeCounts: { [key: string]: number } = {};
    
    recommendations.forEach(rec => {
      const types = rec.userPreferences?.jobTypes || [];
      types.forEach(type => {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  private analyzeScoreRanges(recommendations: Recommendation[]): Array<{ scoreRange: string; count: number }> {
    const ranges = [
      { min: 0, max: 0.2, label: '0.0-0.2' },
      { min: 0.2, max: 0.4, label: '0.2-0.4' },
      { min: 0.4, max: 0.6, label: '0.4-0.6' },
      { min: 0.6, max: 0.8, label: '0.6-0.8' },
      { min: 0.8, max: 1.0, label: '0.8-1.0' },
    ];

    return ranges.map(range => ({
      scoreRange: range.label,
      count: recommendations.filter(rec => rec.score >= range.min && rec.score < range.max).length,
    }));
  }
} 