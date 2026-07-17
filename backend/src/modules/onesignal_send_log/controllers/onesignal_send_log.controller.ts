import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateOnesignalSendLogDto } from '../dto/create-onesignal_send_log.dto';
import { UpdateOnesignalSendLogDto } from '../dto/update-onesignal_send_log.dto';
import { FindOnesignalSendLogService } from '../services/find-onesignal_send_log.service';
import { CreateOnesignalSendLogService } from '../services/create-onesignal_send_log.service';
import { UpdateOnesignalSendLogService } from '../services/update-onesignal_send_log.service';
import { DeleteOnesignalSendLogService } from '../services/delete-onesignal_send_log.service';

@Controller('onesignal-send-log')
@UseGuards(JwtAuthGuard)
export class OnesignalSendLogController {
  constructor(
    private readonly findService: FindOnesignalSendLogService,
    private readonly createService: CreateOnesignalSendLogService,
    private readonly updateService: UpdateOnesignalSendLogService,
    private readonly deleteService: DeleteOnesignalSendLogService,
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
  async create(@Body() dto: CreateOnesignalSendLogDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOnesignalSendLogDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
