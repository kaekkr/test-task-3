import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class AppController {
  @EventPattern('bitrix.responses')
  handleBitrixResponse(@Payload() message: any) {
    console.log('Bitrix Service Response Received: ', message);
  }
}
