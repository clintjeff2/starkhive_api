import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Job } from './job.entity';
import { Freelancer } from './freelancer.entity';

@Entity('matching_history')
export class MatchingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  jobId: string;

  @Column('uuid')
  freelancerId: string;

  @Column('decimal', { precision: 5, scale: 2 })
  matchingScore: number;

  @Column('json')
  scoreBreakdown: {
    skillsScore: number;
    experienceScore: number;
    budgetScore: number;
    categoryScore: number;
    availabilityScore: number;
  };

  @Column({ nullable: true })
  action: string; // 'viewed', 'applied', 'ignored'

  @ManyToOne(() => Job, job => job.matchingHistory)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => Freelancer, freelancer => freelancer.matchingHistory)
  @JoinColumn({ name: 'freelancerId' })
  freelancer: Freelancer;

  @CreateDateColumn()
  createdAt: Date;
}