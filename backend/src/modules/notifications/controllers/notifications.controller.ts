import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateNotificationsDto } from '../dto/create-notifications.dto';
import { UpdateNotificationsDto } from '../dto/update-notifications.dto';
import { FindNotificationsService } from '../services/find-notifications.service';
import { CreateNotificationsService } from '../services/create-notifications.service';
import { UpdateNotificationsService } from '../services/update-notifications.service';
import { DeleteNotificationsService } from '../services/delete-notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly findService: FindNotificationsService,
    private readonly createService: CreateNotificationsService,
    private readonly updateService: UpdateNotificationsService,
    private readonly deleteService: DeleteNotificationsService,
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
  async create(@Body() dto: CreateNotificationsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateNotificationsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
