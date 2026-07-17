import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateClassSubjectModalityDto } from '../dto/create-class_subject_modality.dto';
import { UpdateClassSubjectModalityDto } from '../dto/update-class_subject_modality.dto';
import { FindClassSubjectModalityService } from '../services/find-class_subject_modality.service';
import { CreateClassSubjectModalityService } from '../services/create-class_subject_modality.service';
import { UpdateClassSubjectModalityService } from '../services/update-class_subject_modality.service';
import { DeleteClassSubjectModalityService } from '../services/delete-class_subject_modality.service';

@Controller('class-subject-modality')
@UseGuards(JwtAuthGuard)
export class ClassSubjectModalityController {
  constructor(
    private readonly findService: FindClassSubjectModalityService,
    private readonly createService: CreateClassSubjectModalityService,
    private readonly updateService: UpdateClassSubjectModalityService,
    private readonly deleteService: DeleteClassSubjectModalityService,
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
  async create(@Body() dto: CreateClassSubjectModalityDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateClassSubjectModalityDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
