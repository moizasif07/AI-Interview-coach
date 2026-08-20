import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { User } from './entities/user.entity';
import { Interview } from './entities/interview.entity';
import { Question } from './entities/question.entity';
import { Answer } from './entities/answer.entity';
import { Report } from './entities/report.entity';
import { UsersModule } from './modules/users/users.module';
import { AiModule } from './modules/ai/ai.module';
import { EmailModule } from './modules/email/email.module';
import { InterviewsModule } from './modules/interviews/interviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('database.path'),
        entities: [User, Interview, Question, Answer, Report],
        synchronize: true, // OK for MVP; use migrations in production
        logging: process.env.TYPEORM_DEBUG === 'true' ? ['query', 'error'] : false,
      }),
    }),
    UsersModule,
    AiModule,
    EmailModule,
    InterviewsModule,
  ],
})
export class AppModule {}
