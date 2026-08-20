import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview, InterviewStatus } from '../../entities/interview.entity';
import { Question } from '../../entities/question.entity';
import { Answer } from '../../entities/answer.entity';
import { Report } from '../../entities/report.entity';
import { AiService } from '../ai/ai.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { InterviewRole } from './dto/roles.enum';

@Injectable()
export class InterviewsService {
  constructor(
    @InjectRepository(Interview) private interviewsRepo: Repository<Interview>,
    @InjectRepository(Question) private questionsRepo: Repository<Question>,
    @InjectRepository(Answer) private answersRepo: Repository<Answer>,
    @InjectRepository(Report) private reportsRepo: Repository<Report>,
    private aiService: AiService,
    private emailService: EmailService,
    private usersService: UsersService,
  ) {}

  getAvailableRoles(): string[] {
    return Object.values(InterviewRole);
  }

  // 1. Create Interview
  async createInterview(dto: CreateInterviewDto): Promise<Interview> {
    const user = await this.usersService.findOrCreate(dto.userName, dto.userEmail);

    const interview = this.interviewsRepo.create({
      userId: user.id,
      role: dto.role,
      difficulty: dto.difficulty || undefined,
      jobDescription: dto.jobDescription,
      status: InterviewStatus.CREATED,
    });
    const saved = await this.interviewsRepo.save(interview);
    return this.findOne(saved.id);
  }

  // 2. Generate Questions
  async generateQuestions(interviewId: string, numberOfQuestions = 5): Promise<Interview> {
    const interview = await this.findOne(interviewId);

    const generated = await this.aiService.generateQuestions(
      interview.role,
      interview.difficulty,
      numberOfQuestions,
      interview.jobDescription,
    );

    const questions = generated.map((q, idx) =>
      this.questionsRepo.create({
        interviewId: interview.id,
        text: q.text,
        category: q.category || 'general',
        order: idx + 1,
      }),
    );

    await this.questionsRepo.save(questions);
    await this.interviewsRepo.update(interview.id, { status: InterviewStatus.QUESTIONS_GENERATED });

    return this.findOne(interviewId);
  }

  // 3. Submit Answers (one at a time or all at once)
  async submitAnswers(interviewId: string, dto: SubmitAnswersDto): Promise<Interview> {
    const interview = await this.findOne(interviewId);

    if (!interview.questions || interview.questions.length === 0) {
      throw new BadRequestException('Generate questions before submitting answers');
    }

    const validQuestionIds = new Set(interview.questions.map((q) => q.id));

    for (const item of dto.answers) {
      if (!validQuestionIds.has(item.questionId)) {
        throw new BadRequestException(`Question ${item.questionId} does not belong to this interview`);
      }

      const existing = await this.answersRepo.findOne({
        where: { interviewId, questionId: item.questionId },
      });

      if (existing) {
        existing.text = item.text;
        await this.answersRepo.save(existing);
      } else {
        const answer = this.answersRepo.create({
          interviewId,
          questionId: item.questionId,
          text: item.text,
        });
        await this.answersRepo.save(answer);
      }
    }

    const totalAnswers = await this.answersRepo.count({ where: { interviewId } });
    const newStatus =
      totalAnswers >= interview.questions.length ? InterviewStatus.COMPLETED : InterviewStatus.IN_PROGRESS;
    await this.interviewsRepo.update(interview.id, { status: newStatus });

    return this.findOne(interviewId);
  }

  // 4. Analyze Interview
  async analyzeInterview(interviewId: string): Promise<Report> {
    const interview = await this.findOne(interviewId);

    if (!interview.answers || interview.answers.length === 0) {
      throw new BadRequestException('No answers submitted yet for this interview');
    }

    const qaPairs = interview.questions
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const answer = interview.answers.find((a) => a.questionId === q.id);
        return { question: q.text, answer: answer?.text || '' };
      });

    const analysis = await this.aiService.analyzeInterview(interview.role, interview.difficulty, qaPairs);

    let report = await this.reportsRepo.findOne({ where: { interviewId } });
    if (report) {
      Object.assign(report, analysis);
    } else {
      report = this.reportsRepo.create({ interviewId, ...analysis });
    }
    report = await this.reportsRepo.save(report);

    await this.interviewsRepo.update(interview.id, { status: InterviewStatus.ANALYZED });

    return report;
  }

  // 5. Generate/Get Report
  async getReport(interviewId: string): Promise<Report> {
    const interview = await this.findOne(interviewId);
    let report = await this.reportsRepo.findOne({ where: { interviewId } });

    if (!report) {
      // auto-generate if not yet analyzed
      report = await this.analyzeInterview(interviewId);
    }

    return report;
  }

  // 6. Send Report Email
  async sendReportEmail(interviewId: string): Promise<{ sent: boolean; provider: any }> {
    const interview = await this.findOne(interviewId);
    const report = await this.getReport(interviewId);

    const result: any = await this.emailService.sendInterviewReport(
      interview.user.email,
      interview.user.name,
      interview,
      report,
    );

    const sent = !result?.error;
    if (sent) {
      report.emailSent = true;
      await this.reportsRepo.save(report);
    }

    return { sent, provider: result };
  }

  async findOne(id: string): Promise<Interview> {
    const interview = await this.interviewsRepo.findOne({
      where: { id },
      relations: ['questions', 'answers', 'report', 'user'],
    });
    if (!interview) {
      throw new NotFoundException(`Interview ${id} not found`);
    }
    interview.questions?.sort((a, b) => a.order - b.order);
    return interview;
  }

  async findHistoryByEmail(email: string): Promise<Interview[]> {
    return this.interviewsRepo.find({
      where: { user: { email } },
      relations: ['questions', 'answers', 'report', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Interview[]> {
    return this.interviewsRepo.find({
      relations: ['user', 'report'],
      order: { createdAt: 'DESC' },
    });
  }
}
