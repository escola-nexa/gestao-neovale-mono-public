import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorDocumentFilesDto } from '../dto/create-professor_document_files.dto';
import { UpdateProfessorDocumentFilesDto } from '../dto/update-professor_document_files.dto';
import { FindProfessorDocumentFilesService } from '../services/find-professor_document_files.service';
import { CreateProfessorDocumentFilesService } from '../services/create-professor_document_files.service';
import { UpdateProfessorDocumentFilesService } from '../services/update-professor_document_files.service';
import { DeleteProfessorDocumentFilesService } from '../services/delete-professor_document_files.service';

@Controller('professor-document-files')
@UseGuards(JwtAuthGuard)
export class ProfessorDocumentFilesController {
  constructor(
    private readonly findService: FindProfessorDocumentFilesService,
    private readonly createService: CreateProfessorDocumentFilesService,
    private readonly updateService: UpdateProfessorDocumentFilesService,
    private readonly deleteService: DeleteProfessorDocumentFilesService,
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
  async create(@Body() dto: CreateProfessorDocumentFilesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorDocumentFilesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
