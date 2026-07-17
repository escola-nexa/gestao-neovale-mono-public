import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherSubstitutionPaymentsDto } from '../dto/create-teacher_substitution_payments.dto';
import { UpdateTeacherSubstitutionPaymentsDto } from '../dto/update-teacher_substitution_payments.dto';
import { FindTeacherSubstitutionPaymentsService } from '../services/find-teacher_substitution_payments.service';
import { CreateTeacherSubstitutionPaymentsService } from '../services/create-teacher_substitution_payments.service';
import { UpdateTeacherSubstitutionPaymentsService } from '../services/update-teacher_substitution_payments.service';
import { DeleteTeacherSubstitutionPaymentsService } from '../services/delete-teacher_substitution_payments.service';

@Controller('teacher-substitution-payments')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionPaymentsController {
  constructor(
    private readonly findService: FindTeacherSubstitutionPaymentsService,
    private readonly createService: CreateTeacherSubstitutionPaymentsService,
    private readonly updateService: UpdateTeacherSubstitutionPaymentsService,
    private readonly deleteService: DeleteTeacherSubstitutionPaymentsService,
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
  async create(@Body() dto: CreateTeacherSubstitutionPaymentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherSubstitutionPaymentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
