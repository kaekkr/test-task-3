import { InjectQueue } from '@nestjs/bull';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Queue } from 'bull';

@Controller()
export class AppController {
  constructor(@InjectQueue('bitrix_jobs') private readonly queue: Queue) {}

  @EventPattern('user_created')
  async handleUserCreated(@Payload() data: any) {
    console.log('Received user_created event: ', data);

    try {
      const job = await this.queue.add('bitrix_job', data, {
        priority: 1,
        delay: 0,
      });
      console.log('Job added to queue with ID: ', job.id);
    } catch (error) {
      console.error('Error adding job to queue: ', error);
    }
  }

  @EventPattern('user_updated')
  async handleUserUpdated(@Payload() data: any) {
    console.log('Received user_updated event: ', data);

    try {
      const job = await this.queue.add('bitrix_job', data, {
        priority: 2,
        delay: 0,
      });
      console.log('Job added to queue with ID: ', job.id);
    } catch (error) {
      console.error('Error adding job to queue: ', error);
    }
  }

  @EventPattern('user_moved')
  async handleUserMoved(@Payload() data: any) {
    console.log('Received user_moved event: ', data);

    try {
      const job = await this.queue.add('bitrix_job', data, {
        priority: 3,
        delay: 0,
      });
      console.log('Job added to queue with ID: ', job.id);
    } catch (error) {
      console.error('Error adding job to queue: ', error);
    }
  }
}
