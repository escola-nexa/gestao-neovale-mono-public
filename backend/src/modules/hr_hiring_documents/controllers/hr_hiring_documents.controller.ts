import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrHiringDocumentsDto } from '../dto/create-hr_hiring_documents.dto';
import { UpdateHrHiringDocumentsDto } from '../dto/update-hr_hiring_documents.dto';
import { FindHrHiringDocumentsService } from '../services/find-hr_hiring_documents.service';
import { CreateHrHiringDocumentsService } from '../services/create-hr_hiring_documents.service';
import { UpdateHrHiringDocumentsService } from '../services/update-hr_hiring_documents.service';
import { DeleteHrHiringDocumentsService } from '../services/delete-hr_hiring_documents.service';

@Controller('hr-hiring-documents')
@UseGuards(JwtAuthGuard)
export class HrHiringDocumentsController {
  constructor(
    private readonly findService: FindHrHiringDocumentsService,
    private readonly createService: CreateHrHiringDocumentsService,
    private readonly updateService: UpdateHrHiringDocumentsService,
    private readonly deleteService: DeleteHrHiringDocumentsService,
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
  async create(@Body() dto: CreateHrHiringDocumentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrHiringDocumentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
