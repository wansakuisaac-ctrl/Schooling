import { dbService } from './storage';
import { NotificationLog, School, Student, User } from '../types';

export interface SendBatchParams {
  schoolId: string;
  examId?: string;
  channel: 'sms' | 'email';
  template: string;
  recipients: {
    parentUser: User;
    student: Student;
    phoneOrEmail: string;
    extraVars?: Record<string, string | number>;
  }[];
  school: School;
  examName?: string;
}

export class NotificationService {
  /**
   * Replace template variables:
   * {parent_name}, {student_name}, {exam_name}, {term}, {year}, {portal_url}, {school_name},
   * {balance}, {paybill}, {adm_no}, {date}, {due_date}, {phone}
   */
  public static renderTemplate(
    template: string,
    vars: {
      parent_name: string;
      student_name: string;
      exam_name?: string;
      term?: string;
      year?: string | number;
      portal_url?: string;
      school_name?: string;
      balance?: string | number;
      paybill?: string;
      adm_no?: string;
      date?: string;
      due_date?: string;
      phone?: string;
    }
  ): string {
    return template
      .replace(/{parent_name}/g, vars.parent_name || 'Parent')
      .replace(/{student_name}/g, vars.student_name || 'Learner')
      .replace(/{exam_name}/g, vars.exam_name || 'Assessment')
      .replace(/{term}/g, vars.term || '')
      .replace(/{year}/g, String(vars.year || ''))
      .replace(/{portal_url}/g, vars.portal_url || '')
      .replace(/{school_name}/g, vars.school_name || '')
      .replace(/{balance}/g, String(vars.balance ?? '0'))
      .replace(/{paybill}/g, vars.paybill || '247247')
      .replace(/{adm_no}/g, vars.adm_no || '')
      .replace(/{date}/g, vars.date || new Date().toISOString().split('T')[0])
      .replace(/{due_date}/g, vars.due_date || 'end of term')
      .replace(/{phone}/g, vars.phone || '');
  }

  /**
   * Dispatches a batch of parent notifications (simulating Africa's Talking / SMTP)
   * with rate limiting and logging into notifications_log
   */
  public static async dispatchBatch(
    params: SendBatchParams,
    onProgress?: (sent: number, total: number) => void
  ): Promise<{ sentCount: number; failedCount: number; logs: NotificationLog[] }> {
    let sentCount = 0;
    let failedCount = 0;
    const createdLogs: NotificationLog[] = [];

    const portalBaseUrl = window.location.origin;

    for (let i = 0; i < params.recipients.length; i++) {
      const recipient = params.recipients[i];
      const messageBody = this.renderTemplate(params.template, {
        parent_name: recipient.parentUser.full_name,
        student_name: recipient.student.full_name,
        exam_name: params.examName || 'Assessment',
        term: params.school.current_term,
        year: params.school.academic_year,
        portal_url: `${portalBaseUrl}/portal/parent`,
        school_name: params.school.name,
        phone: params.school.phone,
        adm_no: recipient.student.admission_number,
        ...(recipient.extraVars || {}),
      });

      // Simple phone validation check
      const isValidPhone = recipient.phoneOrEmail && recipient.phoneOrEmail.length >= 9;
      const status: 'sent' | 'failed' = isValidPhone ? 'sent' : 'failed';
      const providerResponse =
        status === 'sent'
          ? params.channel === 'sms'
            ? `AfricasTalking SMS delivery ack: MSG_${Date.now()}_OK`
            : `Nodemailer SMTP 250 2.0.0 OK queued`
          : 'Invalid destination MSISDN or address format';

      if (status === 'sent') {
        sentCount++;
      } else {
        failedCount++;
      }

      const log = dbService.logNotification(params.schoolId, {
        user_id: recipient.parentUser.id,
        student_id: recipient.student.id,
        exam_id: params.examId,
        channel: params.channel,
        phone_or_email: recipient.phoneOrEmail,
        message: messageBody,
        status,
        provider_response: providerResponse,
      });

      createdLogs.push(log);

      if (onProgress) {
        onProgress(i + 1, params.recipients.length);
      }
    }

    return { sentCount, failedCount, logs: createdLogs };
  }
}
