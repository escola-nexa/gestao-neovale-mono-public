import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherSubstitutionSettingsDto } from '../dto/create-teacher_substitution_settings.dto';
import { UpdateTeacherSubstitutionSettingsDto } from '../dto/update-teacher_substitution_settings.dto';
import { FindTeacherSubstitutionSettingsService } from '../services/find-teacher_substitution_settings.service';
import { CreateTeacherSubstitutionSettingsService } from '../services/create-teacher_substitution_settings.service';
import { UpdateTeacherSubstitutionSettingsService } from '../services/update-teacher_substitution_settings.service';
import { DeleteTeacherSubstitutionSettingsService } from '../services/delete-teacher_substitution_settings.service';

@Controller('teacher-substitution-settings')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionSettingsController {
  constructor(
    private readonly findService: FindTeacherSubstitutionSettingsService,
    private readonly createService: CreateTeacherSubstitutionSettingsService,
    private readonly updateService: UpdateTeacherSubstitutionSettingsService,
    private readonly deleteService: DeleteTeacherSubstitutionSettingsService,
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
  async create(@Body() dto: CreateTeacherSubstitutionSettingsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherSubstitutionSettingsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
