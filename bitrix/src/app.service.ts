import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Queue } from 'bull';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject('BITRIX_RMQ_SERVICE') private client: ClientProxy,
    @InjectQueue('bitrix_jobs') private queue: Queue,
  ) {}

  async onModuleInit() {
    this.queue.on('failed', (job, err) => {
      console.log(`Job ${job.id} failed: ${err.message}`);
    });

    this.queue.on('stalled', (job) => {
      console.log(`Job ${job.id} stalled`);
    });

    this.queue.on('completed', (job, result) => {
      console.log(
        `Job ${job.id} completed after ${job.attemptsMade + 1} attempt(s)`,
      );
    });
  }

  async sendReply(queue: string, message: any) {
    try {
      this.client.emit('bitrix.responses', message);
      console.log('Reply sent to queue: ', queue);
    } catch (error) {
      console.error('Error sending reply: ', error);
    }
  }
}
