import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherSubstitutionFinancialAccessDto } from '../dto/create-teacher_substitution_financial_access.dto';
import { UpdateTeacherSubstitutionFinancialAccessDto } from '../dto/update-teacher_substitution_financial_access.dto';
import { FindTeacherSubstitutionFinancialAccessService } from '../services/find-teacher_substitution_financial_access.service';
import { CreateTeacherSubstitutionFinancialAccessService } from '../services/create-teacher_substitution_financial_access.service';
import { UpdateTeacherSubstitutionFinancialAccessService } from '../services/update-teacher_substitution_financial_access.service';
import { DeleteTeacherSubstitutionFinancialAccessService } from '../services/delete-teacher_substitution_financial_access.service';

@Controller('teacher-substitution-financial-access')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionFinancialAccessController {
  constructor(
    private readonly findService: FindTeacherSubstitutionFinancialAccessService,
    private readonly createService: CreateTeacherSubstitutionFinancialAccessService,
    private readonly updateService: UpdateTeacherSubstitutionFinancialAccessService,
    private readonly deleteService: DeleteTeacherSubstitutionFinancialAccessService,
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
  async create(@Body() dto: CreateTeacherSubstitutionFinancialAccessDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherSubstitutionFinancialAccessDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
