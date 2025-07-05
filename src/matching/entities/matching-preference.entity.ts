import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Freelancer } from './freelancer.entity';

@Entity('matching_preferences')
export class MatchingPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  freelancerId: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minBudget: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maxBudget: number;

  @Column('simple-array', { nullable: true })
  preferredCategories: string[];

  @Column('simple-array', { nullable: true })
  excludedCategories: string[];

  @Column('simple-array', { nullable: true })
  preferredDurations: string[];

  @Column({ default: true })
  receiveRecommendations: boolean;

  @Column('int', { default: 10 })
  maxRecommendationsPerDay: number;

  @OneToOne(() => Freelancer, (freelancer) => freelancer.preferences)
  @JoinColumn({ name: 'freelancerId' })
  freelancer: Freelancer;
}
