import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorDocumentsDto } from '../dto/create-professor_documents.dto';
import { UpdateProfessorDocumentsDto } from '../dto/update-professor_documents.dto';
import { FindProfessorDocumentsService } from '../services/find-professor_documents.service';
import { CreateProfessorDocumentsService } from '../services/create-professor_documents.service';
import { UpdateProfessorDocumentsService } from '../services/update-professor_documents.service';
import { DeleteProfessorDocumentsService } from '../services/delete-professor_documents.service';

@Controller('professor-documents')
@UseGuards(JwtAuthGuard)
export class ProfessorDocumentsController {
  constructor(
    private readonly findService: FindProfessorDocumentsService,
    private readonly createService: CreateProfessorDocumentsService,
    private readonly updateService: UpdateProfessorDocumentsService,
    private readonly deleteService: DeleteProfessorDocumentsService,
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
  async create(@Body() dto: CreateProfessorDocumentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorDocumentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
