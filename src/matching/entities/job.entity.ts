import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MatchingHistory } from './matching-history.entity';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('simple-array')
  requiredSkills: string[];

  @Column('simple-array', { nullable: true })
  preferredSkills: string[];

  @Column()
  experienceLevel: string; // 'junior', 'mid', 'senior'

  @Column('decimal', { precision: 10, scale: 2 })
  budget: number;

  @Column()
  duration: string; // 'short', 'medium', 'long'

  @Column()
  category: string;

  @Column({ default: true })
  isActive: boolean;

  @Column('uuid')
  clientId: string;

  @OneToMany(() => MatchingHistory, (history) => history.job)
  matchingHistory: MatchingHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
