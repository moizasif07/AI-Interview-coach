import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Interview } from './interview.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Interview, (interview) => interview.report, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewId' })
  interview: Interview;

  @Column()
  interviewId: string;

  @Column({ type: 'int' })
  overallScore: number;

  @Column({ type: 'int' })
  communicationScore: number;

  @Column({ type: 'int' })
  technicalScore: number;

  @Column({ type: 'simple-json' })
  strengths: string[];

  @Column({ type: 'simple-json' })
  weaknesses: string[];

  @Column({ type: 'simple-json' })
  areasForImprovement: string[];

  @Column({ type: 'simple-json' })
  suggestedResources: string[];

  @Column({ type: 'text' })
  hiringRecommendation: string;

  @Column({ default: false })
  emailSent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
