import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateWebhookEventsDto } from '../dto/create-webhook_events.dto';
import { UpdateWebhookEventsDto } from '../dto/update-webhook_events.dto';
import { FindWebhookEventsService } from '../services/find-webhook_events.service';
import { CreateWebhookEventsService } from '../services/create-webhook_events.service';
import { UpdateWebhookEventsService } from '../services/update-webhook_events.service';
import { DeleteWebhookEventsService } from '../services/delete-webhook_events.service';

@Controller('webhook-events')
@UseGuards(JwtAuthGuard)
export class WebhookEventsController {
  constructor(
    private readonly findService: FindWebhookEventsService,
    private readonly createService: CreateWebhookEventsService,
    private readonly updateService: UpdateWebhookEventsService,
    private readonly deleteService: DeleteWebhookEventsService,
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
  async create(@Body() dto: CreateWebhookEventsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookEventsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
