import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

@ApiTags('Interviews')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get('roles/list')
  @ApiOperation({ summary: 'List available predefined interview roles' })
  listRoles() {
    return { roles: this.interviewsService.getAvailableRoles() };
  }
  
  @Get()
  @ApiOperation({ summary: 'List all interviews (or filter by candidate email for history)' })
  @ApiQuery({ name: 'email', required: false, description: 'Filter interview history by candidate email' })
  findAll(@Query('email') email?: string) {
    if (email) {
      return this.interviewsService.findHistoryByEmail(email);
    }
    return this.interviewsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '1. Create Interview - registers candidate + selects role/difficulty' })
  createInterview(@Body() dto: CreateInterviewDto) {
    return this.interviewsService.createInterview(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single interview with questions, answers, and report' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.interviewsService.findOne(id);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: '2. Generate Questions - AI generates 5-10 role-specific interview questions' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiQuery({ name: 'count', required: false, description: 'Number of questions (3-10), default 5' })
  generateQuestions(@Param('id', ParseUUIDPipe) id: string, @Query('count') count?: string) {
    const numberOfQuestions = count ? Math.min(10, Math.max(3, parseInt(count, 10))) : 5;
    return this.interviewsService.generateQuestions(id, numberOfQuestions);
  }

  @Post(':id/answers')
  @ApiOperation({ summary: '3. Submit Answers - submit one answer at a time or all at once' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  submitAnswers(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SubmitAnswersDto) {
    return this.interviewsService.submitAnswers(id, dto);
  }

  @Post(':id/analyze')
  @ApiOperation({ summary: '4. Analyze Interview - AI scores and evaluates all submitted answers' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  analyzeInterview(@Param('id', ParseUUIDPipe) id: string) {
    return this.interviewsService.analyzeInterview(id);
  }

  @Get(':id/report')
  @ApiOperation({ summary: '5. Generate/Get Report - returns the full professional interview report' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  getReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.interviewsService.getReport(id);
  }

  @Post(':id/send-report')
  @ApiOperation({ summary: '6. Send Report Email - emails the report to the candidate via Resend' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  sendReportEmail(@Param('id', ParseUUIDPipe) id: string) {
    return this.interviewsService.sendReportEmail(id);
  }
}
