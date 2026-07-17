import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateUserNotificationPrefsDto } from '../dto/create-user_notification_prefs.dto';
import { UpdateUserNotificationPrefsDto } from '../dto/update-user_notification_prefs.dto';
import { FindUserNotificationPrefsService } from '../services/find-user_notification_prefs.service';
import { CreateUserNotificationPrefsService } from '../services/create-user_notification_prefs.service';
import { UpdateUserNotificationPrefsService } from '../services/update-user_notification_prefs.service';
import { DeleteUserNotificationPrefsService } from '../services/delete-user_notification_prefs.service';

@Controller('user-notification-prefs')
@UseGuards(JwtAuthGuard)
export class UserNotificationPrefsController {
  constructor(
    private readonly findService: FindUserNotificationPrefsService,
    private readonly createService: CreateUserNotificationPrefsService,
    private readonly updateService: UpdateUserNotificationPrefsService,
    private readonly deleteService: DeleteUserNotificationPrefsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateUserNotificationPrefsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserNotificationPrefsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
