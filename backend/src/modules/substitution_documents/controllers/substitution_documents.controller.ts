import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSubstitutionDocumentsDto } from '../dto/create-substitution_documents.dto';
import { UpdateSubstitutionDocumentsDto } from '../dto/update-substitution_documents.dto';
import { FindSubstitutionDocumentsService } from '../services/find-substitution_documents.service';
import { CreateSubstitutionDocumentsService } from '../services/create-substitution_documents.service';
import { UpdateSubstitutionDocumentsService } from '../services/update-substitution_documents.service';
import { DeleteSubstitutionDocumentsService } from '../services/delete-substitution_documents.service';

@Controller('substitution-documents')
@UseGuards(JwtAuthGuard)
export class SubstitutionDocumentsController {
  constructor(
    private readonly findService: FindSubstitutionDocumentsService,
    private readonly createService: CreateSubstitutionDocumentsService,
    private readonly updateService: UpdateSubstitutionDocumentsService,
    private readonly deleteService: DeleteSubstitutionDocumentsService,
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
  async create(@Body() dto: CreateSubstitutionDocumentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubstitutionDocumentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
