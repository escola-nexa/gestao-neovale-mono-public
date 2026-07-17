import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateWebhookDeliveriesDto } from '../dto/create-webhook_deliveries.dto';
import { UpdateWebhookDeliveriesDto } from '../dto/update-webhook_deliveries.dto';
import { FindWebhookDeliveriesService } from '../services/find-webhook_deliveries.service';
import { CreateWebhookDeliveriesService } from '../services/create-webhook_deliveries.service';
import { UpdateWebhookDeliveriesService } from '../services/update-webhook_deliveries.service';
import { DeleteWebhookDeliveriesService } from '../services/delete-webhook_deliveries.service';

@Controller('webhook-deliveries')
@UseGuards(JwtAuthGuard)
export class WebhookDeliveriesController {
  constructor(
    private readonly findService: FindWebhookDeliveriesService,
    private readonly createService: CreateWebhookDeliveriesService,
    private readonly updateService: UpdateWebhookDeliveriesService,
    private readonly deleteService: DeleteWebhookDeliveriesService,
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
  async create(@Body() dto: CreateWebhookDeliveriesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookDeliveriesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
