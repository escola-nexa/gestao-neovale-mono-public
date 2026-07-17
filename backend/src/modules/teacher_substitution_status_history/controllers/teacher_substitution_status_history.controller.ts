import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherSubstitutionStatusHistoryDto } from '../dto/create-teacher_substitution_status_history.dto';
import { UpdateTeacherSubstitutionStatusHistoryDto } from '../dto/update-teacher_substitution_status_history.dto';
import { FindTeacherSubstitutionStatusHistoryService } from '../services/find-teacher_substitution_status_history.service';
import { CreateTeacherSubstitutionStatusHistoryService } from '../services/create-teacher_substitution_status_history.service';
import { UpdateTeacherSubstitutionStatusHistoryService } from '../services/update-teacher_substitution_status_history.service';
import { DeleteTeacherSubstitutionStatusHistoryService } from '../services/delete-teacher_substitution_status_history.service';

@Controller('teacher-substitution-status-history')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionStatusHistoryController {
  constructor(
    private readonly findService: FindTeacherSubstitutionStatusHistoryService,
    private readonly createService: CreateTeacherSubstitutionStatusHistoryService,
    private readonly updateService: UpdateTeacherSubstitutionStatusHistoryService,
    private readonly deleteService: DeleteTeacherSubstitutionStatusHistoryService,
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
  async create(@Body() dto: CreateTeacherSubstitutionStatusHistoryDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherSubstitutionStatusHistoryDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
