import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateOnesignalSettingsDto } from '../dto/create-onesignal_settings.dto';
import { UpdateOnesignalSettingsDto } from '../dto/update-onesignal_settings.dto';
import { FindOnesignalSettingsService } from '../services/find-onesignal_settings.service';
import { CreateOnesignalSettingsService } from '../services/create-onesignal_settings.service';
import { UpdateOnesignalSettingsService } from '../services/update-onesignal_settings.service';
import { DeleteOnesignalSettingsService } from '../services/delete-onesignal_settings.service';

@Controller('onesignal-settings')
@UseGuards(JwtAuthGuard)
export class OnesignalSettingsController {
  constructor(
    private readonly findService: FindOnesignalSettingsService,
    private readonly createService: CreateOnesignalSettingsService,
    private readonly updateService: UpdateOnesignalSettingsService,
    private readonly deleteService: DeleteOnesignalSettingsService,
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
  async create(@Body() dto: CreateOnesignalSettingsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOnesignalSettingsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
