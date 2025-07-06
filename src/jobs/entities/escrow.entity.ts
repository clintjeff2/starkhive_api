import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EscrowStatus {
  LOCKED = 'locked',
  RELEASED = 'released',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded',
}

@Entity('escrows')
export class Escrow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @Column()
  recruiterId: string;

  @Column()
  freelancerId: string;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'enum', enum: ['ETH', 'USDC', 'STRK'] })
  currency: 'ETH' | 'USDC' | 'STRK';

  @Column({ type: 'enum', enum: EscrowStatus, default: EscrowStatus.LOCKED })
  status: EscrowStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
