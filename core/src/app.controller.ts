import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { UserService } from './user/user.service';

@Controller()
export class AppController {
  constructor(
    @Inject(UserService)
    private userService: UserService,
  ) {}

  @EventPattern('bitrix.responses')
  async handleBitrixResponse(@Payload() message: any) {
    console.log('Bitrix Service Response Received: ', message);

    if (message.status === 'success' && message.action === 'create_card') {
      try {
        await this.userService.updateBitrixLeadId(
          message.user_id,
          message.bitrix_lead_id,
        );
        console.log(
          `Saved bitrix_lead_id ${message.bitrix_lead_id} for user ${message.user_id}`,
        );
      } catch (error) {
        console.error('Error updating bitrix_lead_id:', error);
      }
    }

    if (message.status === 'error') {
      console.error(`Bitrix operation failed:`, message);
    }
  }
}
