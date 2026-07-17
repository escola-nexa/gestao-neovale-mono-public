import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateWebhooksDto } from '../dto/create-webhooks.dto';
import { UpdateWebhooksDto } from '../dto/update-webhooks.dto';
import { FindWebhooksService } from '../services/find-webhooks.service';
import { CreateWebhooksService } from '../services/create-webhooks.service';
import { UpdateWebhooksService } from '../services/update-webhooks.service';
import { DeleteWebhooksService } from '../services/delete-webhooks.service';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(
    private readonly findService: FindWebhooksService,
    private readonly createService: CreateWebhooksService,
    private readonly updateService: UpdateWebhooksService,
    private readonly deleteService: DeleteWebhooksService,
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
  async create(@Body() dto: CreateWebhooksDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWebhooksDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
