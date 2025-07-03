import { Process, Processor } from '@nestjs/bull';
import axios from 'axios';
import { Job } from 'bull';
import { AppService } from './app.service';

@Processor('bitrix_jobs')
export class AppProcessor {
  constructor(private readonly appService: AppService) {}

  @Process('bitrix_job')
  async handleJob(job: Job) {
    const attemptNumber = job.attemptsMade + 1;
    const maxAttempts = job.opts?.attempts || 3;

    console.log(
      `Processing bitrix_job (attempt ${attemptNumber}/${maxAttempts}): `,
      job.data,
    );

    const { action, user, replyQueue } = job.data;

    if (!user.phone) {
      console.error('Missing phone number for user: ', user);

      await this.appService.sendReply(replyQueue, {
        status: 'error',
        reason: 'Missing phone number',
        user,
        attempts: attemptNumber,
      });

      throw new Error('Missing phone number - no retry needed');
    }

    try {
      const webhook = process.env.BITRIX_WEBHOOK_URL;
      console.log(
        `Calling Bitrix24 API with action: ${action} (attempt ${attemptNumber})`,
      );

      let response;
      const leadId = user.bitrix_lead_id || user.id;

      if (action === 'create_card') {
        response = await axios.post(`${webhook}/crm.lead.add`, {
          fields: {
            NAME: user.full_name,
            PHONE: [{ VALUE: user.phone, VALUE_TYPE: 'WORK' }],
            STATUS_ID: user.stage,
          },
        });
        console.log('Created lead in Bitrix24: ', response.data);
      }

      if (action === 'update_card') {
        response = await axios.post(`${webhook}/crm.lead.update`, {
          id: leadId,
          fields: {
            NAME: user.full_name,
            PHONE: [{ VALUE: user.phone, VALUE_TYPE: 'WORK' }],
            STATUS_ID: user.stage,
          },
        });
        console.log('Updated lead in Bitrix24: ', response.data);
      }

      if (action === 'move_card') {
        response = await axios.post(`${webhook}/crm.lead.update`, {
          id: leadId,
          fields: {
            STATUS_ID: user.stage,
          },
        });
        console.log('Moved lead in Bitrix24: ', response.data);
      }

      await this.appService.sendReply(replyQueue, {
        status: 'success',
        action,
        user,
        bitrix_response: response?.data,
        attempts: attemptNumber,
      });

      console.log(
        `Job completed successfully after ${attemptNumber} attempt(s)`,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(
        `Error processing job (attempt ${attemptNumber}/${maxAttempts}):`,
        errorMessage,
      );

      if (attemptNumber >= maxAttempts) {
        console.error('All retry attempts exhausted, sending error reply');

        await this.appService.sendReply(replyQueue, {
          status: 'error',
          error: errorMessage,
          user,
          attempts: attemptNumber,
          final_attempt: true,
        });
      } else {
        const nextDelay = 2000 * Math.pow(2, attemptNumber - 1);
        console.log(`Will retry in ${nextDelay}ms`);
      }

      throw err;
    }
  }
}
