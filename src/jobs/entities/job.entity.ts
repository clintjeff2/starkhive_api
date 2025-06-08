import { Application } from 'src/applications/entities/application.entity';
import { User } from 'src/auth/entities/user.entity';
import { JobStatus } from 'src/feed/enums/job-status.enum';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, JoinColumn, ManyToOne, DeleteDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { ExcludeFromQuery } from '../../common/decorators/exclude-from-query.decorator';

@Entity()
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ default: false })
  isFlagged: boolean;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.OPEN
  })
  status: JobStatus;

  @OneToMany(() => Application, (application) => application.job)
  applications: Application[];

  @Column()
  ownerId: number;

  @ManyToOne(() => User, (user) => user.jobs, { eager: false })
  @JoinColumn({ name: 'recruiterId' })
  recruiter: User;

  @Column()
  recruiterId: string;


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  freelancer: any;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  @ExcludeFromQuery()
  deletedAt: Date | null;
}
