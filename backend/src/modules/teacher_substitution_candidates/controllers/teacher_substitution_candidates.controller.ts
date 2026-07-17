import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherSubstitutionCandidatesDto } from '../dto/create-teacher_substitution_candidates.dto';
import { UpdateTeacherSubstitutionCandidatesDto } from '../dto/update-teacher_substitution_candidates.dto';
import { FindTeacherSubstitutionCandidatesService } from '../services/find-teacher_substitution_candidates.service';
import { CreateTeacherSubstitutionCandidatesService } from '../services/create-teacher_substitution_candidates.service';
import { UpdateTeacherSubstitutionCandidatesService } from '../services/update-teacher_substitution_candidates.service';
import { DeleteTeacherSubstitutionCandidatesService } from '../services/delete-teacher_substitution_candidates.service';

@Controller('teacher-substitution-candidates')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionCandidatesController {
  constructor(
    private readonly findService: FindTeacherSubstitutionCandidatesService,
    private readonly createService: CreateTeacherSubstitutionCandidatesService,
    private readonly updateService: UpdateTeacherSubstitutionCandidatesService,
    private readonly deleteService: DeleteTeacherSubstitutionCandidatesService,
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
  async create(@Body() dto: CreateTeacherSubstitutionCandidatesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherSubstitutionCandidatesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
