import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreatePwaSettingsDto } from '../dto/create-pwa_settings.dto';
import { UpdatePwaSettingsDto } from '../dto/update-pwa_settings.dto';
import { FindPwaSettingsService } from '../services/find-pwa_settings.service';
import { CreatePwaSettingsService } from '../services/create-pwa_settings.service';
import { UpdatePwaSettingsService } from '../services/update-pwa_settings.service';
import { DeletePwaSettingsService } from '../services/delete-pwa_settings.service';

@Controller('pwa-settings')
@UseGuards(JwtAuthGuard)
export class PwaSettingsController {
  constructor(
    private readonly findService: FindPwaSettingsService,
    private readonly createService: CreatePwaSettingsService,
    private readonly updateService: UpdatePwaSettingsService,
    private readonly deleteService: DeletePwaSettingsService,
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
  async create(@Body() dto: CreatePwaSettingsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePwaSettingsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
