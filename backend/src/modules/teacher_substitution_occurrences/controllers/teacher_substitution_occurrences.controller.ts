import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherSubstitutionOccurrencesDto } from '../dto/create-teacher_substitution_occurrences.dto';
import { UpdateTeacherSubstitutionOccurrencesDto } from '../dto/update-teacher_substitution_occurrences.dto';
import { FindTeacherSubstitutionOccurrencesService } from '../services/find-teacher_substitution_occurrences.service';
import { CreateTeacherSubstitutionOccurrencesService } from '../services/create-teacher_substitution_occurrences.service';
import { UpdateTeacherSubstitutionOccurrencesService } from '../services/update-teacher_substitution_occurrences.service';
import { DeleteTeacherSubstitutionOccurrencesService } from '../services/delete-teacher_substitution_occurrences.service';

@Controller('teacher-substitution-occurrences')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionOccurrencesController {
  constructor(
    private readonly findService: FindTeacherSubstitutionOccurrencesService,
    private readonly createService: CreateTeacherSubstitutionOccurrencesService,
    private readonly updateService: UpdateTeacherSubstitutionOccurrencesService,
    private readonly deleteService: DeleteTeacherSubstitutionOccurrencesService,
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
  async create(@Body() dto: CreateTeacherSubstitutionOccurrencesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherSubstitutionOccurrencesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
