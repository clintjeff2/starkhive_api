import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('applications')
@Unique(['jobId', 'freelancerId'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @Column()
  freelancerId: string;

  @Column()
  recruiterId: string;

  @Column('text')
  coverLetter: string;

  @CreateDateColumn()
  createdAt: Date;
}
