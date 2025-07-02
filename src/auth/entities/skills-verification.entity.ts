import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity'; // Assuming you have a User entity

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum SkillCategory {
  PROGRAMMING = 'programming',
  DESIGN = 'design',
  MARKETING = 'marketing',
  WRITING = 'writing',
  DATA_ANALYSIS = 'data_analysis',
  PROJECT_MANAGEMENT = 'project_management',
  OTHER = 'other',
}

@Entity('skill_verifications')
export class SkillVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.skillVerifications)
  user: User;

  @Column()
  skillName: string;

  @Column({
    type: 'enum',
    enum: SkillCategory,
    default: SkillCategory.OTHER,
  })
  category: SkillCategory;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({ nullable: true })
  certificateHash: string; // For blockchain verification

  @Column({ nullable: true })
  blockchainTxHash: string; // Transaction hash on blockchain

  @Column({ nullable: true })
  assessmentScore: number;

  @Column({ nullable: true })
  assessmentId: string;

  @Column({ default: 0 })
  credibilityScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  certificateUrl?: string;

  @Column({ nullable: true })
  issuingOrganization?: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'text', nullable: true })
  verificationNotes?: string;
}
