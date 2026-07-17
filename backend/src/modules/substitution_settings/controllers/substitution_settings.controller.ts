import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSubstitutionSettingsDto } from '../dto/create-substitution_settings.dto';
import { UpdateSubstitutionSettingsDto } from '../dto/update-substitution_settings.dto';
import { FindSubstitutionSettingsService } from '../services/find-substitution_settings.service';
import { CreateSubstitutionSettingsService } from '../services/create-substitution_settings.service';
import { UpdateSubstitutionSettingsService } from '../services/update-substitution_settings.service';
import { DeleteSubstitutionSettingsService } from '../services/delete-substitution_settings.service';

@Controller('substitution-settings')
@UseGuards(JwtAuthGuard)
export class SubstitutionSettingsController {
  constructor(
    private readonly findService: FindSubstitutionSettingsService,
    private readonly createService: CreateSubstitutionSettingsService,
    private readonly updateService: UpdateSubstitutionSettingsService,
    private readonly deleteService: DeleteSubstitutionSettingsService,
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
  async create(@Body() dto: CreateSubstitutionSettingsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubstitutionSettingsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
