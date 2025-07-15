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

      if (action === 'create_card') {
        const createFields = {
          NAME: user.full_name,
          PHONE: [{ VALUE: user.phone, VALUE_TYPE: 'WORK' }],
          STATUS_ID: user.stage,
        };

        console.log('Creating lead with fields:', createFields);

        response = await axios.post(`${webhook}/crm.lead.add`, {
          fields: createFields,
        });

        console.log('Created lead in Bitrix24: ', response.data);

        await this.appService.sendReply(replyQueue, {
          status: 'success',
          action,
          user_id: user.id,
          bitrix_lead_id: response.data.result,
          attempts: attemptNumber,
        });
      }

      if (action === 'update_card' || action === 'move_card') {
        if (!user.bitrix_lead_id) {
          throw new Error(
            `Cannot ${action}: user ${user.id} has no bitrix_lead_id`,
          );
        }

        const updateFields =
          action === 'move_card'
            ? { STATUS_ID: user.stage }
            : {
                NAME: user.full_name,
                PHONE: [{ VALUE: user.phone, VALUE_TYPE: 'WORK' }],
                STATUS_ID: user.stage,
              };

        console.log(
          `Updating lead ${user.bitrix_lead_id} with fields:`,
          updateFields,
        );

        response = await axios.post(`${webhook}/crm.lead.update`, {
          id: user.bitrix_lead_id,
          fields: updateFields,
        });

        console.log(`${action} lead in Bitrix24: `, response.data);

        await this.appService.sendReply(replyQueue, {
          status: 'success',
          action,
          user_id: user.id,
          bitrix_lead_id: user.bitrix_lead_id,
          attempts: attemptNumber,
        });
      }

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

      if (err.response?.data) {
        console.error(
          'Bitrix API error details:',
          JSON.stringify(err.response.data, null, 2),
        );
      }

      if (attemptNumber >= maxAttempts) {
        console.error('All retry attempts exhausted, sending error reply');
        await this.appService.sendReply(replyQueue, {
          status: 'error',
          error: errorMessage,
          user_id: user.id,
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
