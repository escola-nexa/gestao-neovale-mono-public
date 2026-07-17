import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreatePwaPushedNotificationsDto } from '../dto/create-pwa_pushed_notifications.dto';
import { UpdatePwaPushedNotificationsDto } from '../dto/update-pwa_pushed_notifications.dto';
import { FindPwaPushedNotificationsService } from '../services/find-pwa_pushed_notifications.service';
import { CreatePwaPushedNotificationsService } from '../services/create-pwa_pushed_notifications.service';
import { UpdatePwaPushedNotificationsService } from '../services/update-pwa_pushed_notifications.service';
import { DeletePwaPushedNotificationsService } from '../services/delete-pwa_pushed_notifications.service';

@Controller('pwa-pushed-notifications')
@UseGuards(JwtAuthGuard)
export class PwaPushedNotificationsController {
  constructor(
    private readonly findService: FindPwaPushedNotificationsService,
    private readonly createService: CreatePwaPushedNotificationsService,
    private readonly updateService: UpdatePwaPushedNotificationsService,
    private readonly deleteService: DeletePwaPushedNotificationsService,
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
  async create(@Body() dto: CreatePwaPushedNotificationsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePwaPushedNotificationsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
