import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Question } from './question.entity';
import { Answer } from './answer.entity';
import { Report } from './report.entity';

export enum InterviewStatus {
  CREATED = 'created',
  QUESTIONS_GENERATED = 'questions_generated',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ANALYZED = 'analyzed',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.interviews, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column()
  role: string;

  @Column({ type: 'text', nullable: true })
  jobDescription: string;

  @Column({ type: 'varchar', default: DifficultyLevel.INTERMEDIATE })
  difficulty: DifficultyLevel;

  @Column({ type: 'varchar', default: InterviewStatus.CREATED })
  status: InterviewStatus;

  @OneToMany(() => Question, (q) => q.interview)
  questions: Question[];

  @OneToMany(() => Answer, (a) => a.interview)
  answers: Answer[];

  @OneToOne(() => Report, (r) => r.interview, { nullable: true })
  report: Report;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
