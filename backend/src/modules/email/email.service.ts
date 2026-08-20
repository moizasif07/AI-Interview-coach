import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Interview } from '../../entities/interview.entity';
import { Report } from '../../entities/report.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('resend.apiKey');
    this.fromEmail = this.config.get<string>('resend.fromEmail');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not set - emails will be logged instead of sent');
    }
  }

  async sendInterviewReport(to: string, name: string, interview: Interview, report: Report) {
    const html = this.buildReportHtml(name, interview, report);
    const subject = `Your ${interview.role} Interview Report - Score: ${report.overallScore}/100`;

    if (!this.resend) {
      this.logger.log(`[DEV MODE] Would send email to ${to} with subject "${subject}"`);
      return { id: 'dev-mode-no-resend-key', simulated: true };
    }

    const result = await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject,
      html,
    });

    return result;
  }

  private buildReportHtml(name: string, interview: Interview, report: Report): string {
    const list = (items: string[]) =>
      (items || []).map((i) => `<li style="margin-bottom:6px;">${this.escape(i)}</li>`).join('');

    return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background:#f4f5f7; padding:24px; margin:0;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#111827;padding:24px 32px;">
      <h1 style="color:#ffffff;margin:0;font-size:20px;">AI Interview Coach</h1>
      <p style="color:#9ca3af;margin:4px 0 0;font-size:14px;">Interview Performance Report</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:15px;color:#111827;">Hi ${this.escape(name)},</p>
      <p style="font-size:15px;color:#374151;">Here is your interview report for the <strong>${this.escape(
        interview.role,
      )}</strong> role (${this.escape(interview.difficulty)} level).</p>

      <div style="display:flex;gap:12px;margin:24px 0;flex-wrap:wrap;">
        <div style="flex:1;min-width:150px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#166534;">${report.overallScore}</div>
          <div style="font-size:12px;color:#166534;">Overall Score</div>
        </div>
        <div style="flex:1;min-width:150px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#1e40af;">${report.communicationScore}</div>
          <div style="font-size:12px;color:#1e40af;">Communication</div>
        </div>
        <div style="flex:1;min-width:150px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#92400e;">${report.technicalScore}</div>
          <div style="font-size:12px;color:#92400e;">Technical</div>
        </div>
      </div>

      <h3 style="color:#111827;font-size:15px;">Strengths</h3>
      <ul style="color:#374151;font-size:14px;padding-left:20px;">${list(report.strengths)}</ul>

      <h3 style="color:#111827;font-size:15px;">Weaknesses</h3>
      <ul style="color:#374151;font-size:14px;padding-left:20px;">${list(report.weaknesses)}</ul>

      <h3 style="color:#111827;font-size:15px;">Areas for Improvement</h3>
      <ul style="color:#374151;font-size:14px;padding-left:20px;">${list(report.areasForImprovement)}</ul>

      <h3 style="color:#111827;font-size:15px;">Suggested Learning Resources</h3>
      <ul style="color:#374151;font-size:14px;padding-left:20px;">${list(report.suggestedResources)}</ul>

      <h3 style="color:#111827;font-size:15px;">Hiring Recommendation</h3>
      <p style="color:#374151;font-size:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;">${this.escape(
        report.hiringRecommendation,
      )}</p>

      <p style="font-size:12px;color:#9ca3af;margin-top:32px;">Generated automatically by AI Interview Coach.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private escape(str: string): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
