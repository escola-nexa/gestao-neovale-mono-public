import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherSubstitutionRequestsDto } from '../dto/create-teacher_substitution_requests.dto';
import { UpdateTeacherSubstitutionRequestsDto } from '../dto/update-teacher_substitution_requests.dto';
import { FindTeacherSubstitutionRequestsService } from '../services/find-teacher_substitution_requests.service';
import { CreateTeacherSubstitutionRequestsService } from '../services/create-teacher_substitution_requests.service';
import { UpdateTeacherSubstitutionRequestsService } from '../services/update-teacher_substitution_requests.service';
import { DeleteTeacherSubstitutionRequestsService } from '../services/delete-teacher_substitution_requests.service';

@Controller('teacher-substitution-requests')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionRequestsController {
  constructor(
    private readonly findService: FindTeacherSubstitutionRequestsService,
    private readonly createService: CreateTeacherSubstitutionRequestsService,
    private readonly updateService: UpdateTeacherSubstitutionRequestsService,
    private readonly deleteService: DeleteTeacherSubstitutionRequestsService,
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
  async create(@Body() dto: CreateTeacherSubstitutionRequestsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherSubstitutionRequestsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
