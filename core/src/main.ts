import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: process.env.RABBITMQ_REPLY_QUEUE || 'bitrix.responses',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3000);

  console.log(
    `Application is running on: http://localhost:${process.env.PORT || 3000}`,
  );
  console.log(
    `Microservice is listening on queue: ${process.env.RABBITMQ_REPLY_QUEUE || 'bitrix.responses'}`,
  );
}

bootstrap();
