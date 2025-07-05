import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MatchingHistory } from './matching-history.entity';
// import { MatchingPreferences } from './matching-preferences.entity';

@Entity('freelancers')
export class Freelancer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column('simple-array')
  skills: string[];

  @Column()
  experienceLevel: string; // 'junior', 'mid', 'senior'

  @Column('int', { default: 0 })
  yearsOfExperience: number;

  @Column('simple-array', { nullable: true })
  categories: string[];

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  hourlyRate: number;

  @Column({ default: true })
  isAvailable: boolean;

  @Column('text', { nullable: true })
  bio: string;

  @OneToMany(() => MatchingHistory, (history) => history.freelancer)
  matchingHistory: MatchingHistory[];

  @Column('json', { nullable: true })
  preferences: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
