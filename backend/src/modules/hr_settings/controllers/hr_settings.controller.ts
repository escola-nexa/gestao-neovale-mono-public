import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrSettingsDto } from '../dto/create-hr_settings.dto';
import { UpdateHrSettingsDto } from '../dto/update-hr_settings.dto';
import { FindHrSettingsService } from '../services/find-hr_settings.service';
import { CreateHrSettingsService } from '../services/create-hr_settings.service';
import { UpdateHrSettingsService } from '../services/update-hr_settings.service';
import { DeleteHrSettingsService } from '../services/delete-hr_settings.service';

@Controller('hr-settings')
@UseGuards(JwtAuthGuard)
export class HrSettingsController {
  constructor(
    private readonly findService: FindHrSettingsService,
    private readonly createService: CreateHrSettingsService,
    private readonly updateService: UpdateHrSettingsService,
    private readonly deleteService: DeleteHrSettingsService,
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
  async create(@Body() dto: CreateHrSettingsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrSettingsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
