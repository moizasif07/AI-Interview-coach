import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interview } from '../../entities/interview.entity';
import { Question } from '../../entities/question.entity';
import { Answer } from '../../entities/answer.entity';
import { Report } from '../../entities/report.entity';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { AiModule } from '../ai/ai.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interview, Question, Answer, Report]),
    AiModule,
    EmailModule,
    UsersModule,
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}
