import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface GeneratedQuestion {
  text: string;
  category: string;
}

export interface AnalysisResult {
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  strengths: string[];
  weaknesses: string[];
  areasForImprovement: string[];
  suggestedResources: string[];
  hiringRecommendation: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI;
  private model: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('openai.apiKey');
    this.model = this.config.get<string>('openai.model');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set - AI service will use fallback content');
    }
  }

  async generateQuestions(
    role: string,
    difficulty: string,
    count: number,
    jobDescription?: string,
  ): Promise<GeneratedQuestion[]> {
    if (!this.client) {
      return this.fallbackQuestions(role, count);
    }

    const prompt = `You are an expert technical interviewer. Generate ${count} interview questions
for a candidate applying for the role of "${role}" at "${difficulty}" difficulty level.
${jobDescription ? `Use this job description as extra context:\n${jobDescription}\n` : ''}
Mix question types appropriately for the role (technical, behavioral, situational, communication).
Respond ONLY with a JSON array, no markdown, no preamble, in this exact shape:
[{"text": "question text", "category": "technical|behavioral|situational|communication"}]`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
      const raw = completion.choices[0]?.message?.content || '[]';
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, count);
      }
      return this.fallbackQuestions(role, count);
    } catch (err) {
      this.logger.error(`Failed to generate questions via OpenAI: ${err.message}`);
      return this.fallbackQuestions(role, count);
    }
  }

  async analyzeInterview(
    role: string,
    difficulty: string,
    qaPairs: { question: string; answer: string }[],
  ): Promise<AnalysisResult> {
    if (!this.client) {
      return this.fallbackAnalysis();
    }

    const transcript = qaPairs
      .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || '(no answer given)'}`)
      .join('\n\n');

    const prompt = `You are a senior technical interviewer and hiring manager evaluating a candidate
for the role of "${role}" at "${difficulty}" difficulty level.

Here is the full interview transcript:

${transcript}

Evaluate the candidate's answers and respond ONLY with valid JSON (no markdown, no preamble) in this
exact shape:
{
  "overallScore": <0-100 integer>,
  "communicationScore": <0-100 integer>,
  "technicalScore": <0-100 integer>,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "areasForImprovement": ["..."],
  "suggestedResources": ["..."],
  "hiringRecommendation": "a short paragraph with a clear hire/no-hire/borderline recommendation and why"
}`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      });
      const raw = completion.choices[0]?.message?.content || '{}';
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return this.normalizeAnalysis(parsed);
    } catch (err) {
      this.logger.error(`Failed to analyze interview via OpenAI: ${err.message}`);
      return this.fallbackAnalysis();
    }
  }

  private normalizeAnalysis(parsed: any): AnalysisResult {
    return {
      overallScore: this.clampScore(parsed.overallScore),
      communicationScore: this.clampScore(parsed.communicationScore),
      technicalScore: this.clampScore(parsed.technicalScore),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement : [],
      suggestedResources: Array.isArray(parsed.suggestedResources) ? parsed.suggestedResources : [],
      hiringRecommendation: parsed.hiringRecommendation || 'No recommendation generated.',
    };
  }

  private clampScore(value: any): number {
    const n = Number(value);
    if (isNaN(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  private fallbackQuestions(role: string, count: number): GeneratedQuestion[] {
    const generic = [
      { text: `Tell me about your experience relevant to the ${role} role.`, category: 'behavioral' },
      { text: `What are the core technical skills required for a ${role}?`, category: 'technical' },
      { text: `Describe a challenging project you worked on and how you handled it.`, category: 'behavioral' },
      { text: `How do you stay up to date with developments relevant to ${role}?`, category: 'communication' },
      { text: `Walk me through how you would approach a typical problem in this role.`, category: 'situational' },
      { text: `Describe a time you disagreed with a teammate. How did you resolve it?`, category: 'behavioral' },
      { text: `What tools or technologies are you most comfortable with for this role?`, category: 'technical' },
      { text: `How do you prioritize tasks when working under a tight deadline?`, category: 'situational' },
      { text: `What's a mistake you made professionally and what did you learn from it?`, category: 'behavioral' },
      { text: `Why are you interested in this ${role} position?`, category: 'communication' },
    ];
    return generic.slice(0, count);
  }

  private fallbackAnalysis(): AnalysisResult {
    return {
      overallScore: 60,
      communicationScore: 60,
      technicalScore: 60,
      strengths: ['Candidate completed the interview'],
      weaknesses: ['AI analysis unavailable - review answers manually'],
      areasForImprovement: ['Configure OPENAI_API_KEY for full AI-powered analysis'],
      suggestedResources: ['https://roadmap.sh'],
      hiringRecommendation:
        'Automated scoring unavailable (no OpenAI API key configured). Please review the transcript manually.',
    };
  }
}
