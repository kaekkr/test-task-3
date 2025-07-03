import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @Inject('BITRIX_SERVICE')
    private client: ClientProxy,
  ) {
    this.client
      .connect()
      .then(() => {
        console.log('Connected to RabbitMQ successfully');
      })
      .catch((err) => {
        console.error('Failed to connect to RabbitMQ: ', err);
      });
  }

  async create(data: Partial<User>) {
    const user = this.userRepo.create(data);
    const saved = await this.userRepo.save(user);

    console.log('About to emit message to BITRIX_SERVICE: ', {
      action: 'create_card',
      user: saved,
      replyQueue: 'bitrix.responses',
    });

    this.client.emit('user_created', {
      action: 'create_card',
      user: saved,
      replyQueue: 'bitrix.responses',
    });

    console.log('Message emitted successfully');
    return saved;
  }

  async update(id: number, data: Partial<User>) {
    await this.userRepo.update(id, data);
    const updated = await this.userRepo.findOneBy({ id });

    this.client.emit('user_updated', {
      action: 'update_card',
      user: updated,
      replyQueue: 'bitrix.responses',
    });

    return updated;
  }

  async move(id: number, newStage: string) {
    await this.userRepo.update(id, { stage: newStage });
    const user = await this.userRepo.findOneBy({ id });

    this.client.emit('user_moved', {
      action: 'move_card',
      user,
      replyQueue: 'bitrix.responses',
    });

    return user;
  }
}
