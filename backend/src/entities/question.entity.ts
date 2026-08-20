import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Interview } from './interview.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Interview, (interview) => interview.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewId' })
  interview: Interview;

  @Column()
  interviewId: string;

  @Column({ type: 'text' })
  text: string;

  @Column()
  order: number;

  @Column({ default: 'general' })
  category: string;

  @CreateDateColumn()
  createdAt: Date;
}
