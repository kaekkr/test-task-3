import { Controller, Post, Patch, Param, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user/user.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() userData: Partial<User>) {
    return this.userService.create(userData);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<User>) {
    return this.userService.update(+id, updateData);
  }

  @Post(':id/move')
  move(@Param('id') id: string, @Body('stage') newStage: string) {
    return this.userService.move(+id, newStage);
  }
}
