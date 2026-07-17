import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherSubstitutionDocumentsDto } from '../dto/create-teacher_substitution_documents.dto';
import { UpdateTeacherSubstitutionDocumentsDto } from '../dto/update-teacher_substitution_documents.dto';
import { FindTeacherSubstitutionDocumentsService } from '../services/find-teacher_substitution_documents.service';
import { CreateTeacherSubstitutionDocumentsService } from '../services/create-teacher_substitution_documents.service';
import { UpdateTeacherSubstitutionDocumentsService } from '../services/update-teacher_substitution_documents.service';
import { DeleteTeacherSubstitutionDocumentsService } from '../services/delete-teacher_substitution_documents.service';

@Controller('teacher-substitution-documents')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionDocumentsController {
  constructor(
    private readonly findService: FindTeacherSubstitutionDocumentsService,
    private readonly createService: CreateTeacherSubstitutionDocumentsService,
    private readonly updateService: UpdateTeacherSubstitutionDocumentsService,
    private readonly deleteService: DeleteTeacherSubstitutionDocumentsService,
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
  async create(@Body() dto: CreateTeacherSubstitutionDocumentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherSubstitutionDocumentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
