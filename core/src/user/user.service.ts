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
    @Inject('BITRIX_CLIENT')
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

    if (!updated) {
      throw new Error(`User with id ${id} not found`);
    }

    if (!updated.bitrix_lead_id) {
      console.warn(`User ${id} has no bitrix_lead_id, skipping Bitrix update`);
      return updated;
    }

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

    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    if (!user.bitrix_lead_id) {
      console.warn(`User ${id} has no bitrix_lead_id, skipping Bitrix move`);
      return user;
    }

    this.client.emit('user_moved', {
      action: 'move_card',
      user,
      replyQueue: 'bitrix.responses',
    });

    return user;
  }

  async updateBitrixLeadId(userId: number, bitrixLeadId: number) {
    await this.userRepo.update(userId, { bitrix_lead_id: bitrixLeadId });
    console.log(`Updated user ${userId} with bitrix_lead_id: ${bitrixLeadId}`);
  }
}
