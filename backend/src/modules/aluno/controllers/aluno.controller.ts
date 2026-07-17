import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateAlunoDto } from '../dto/create-aluno.dto';
import { UpdateAlunoDto } from '../dto/update-aluno.dto';
import { CreateAlunoService } from '../services/create-aluno.service';
import { FindAlunoService } from '../services/find-aluno.service';
import { UpdateAlunoService } from '../services/update-aluno.service';
import { DeleteAlunoService } from '../services/delete-aluno.service';
import { CreateEnrollmentService } from '../services/create-enrollment.service';
import { FindEnrollmentService } from '../services/find-enrollment.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@Controller('alunos')
@UseGuards(JwtAuthGuard)
export class AlunoController {
  constructor(
    private readonly createAlunoService: CreateAlunoService,
    private readonly findAlunoService: FindAlunoService,
    private readonly updateAlunoService: UpdateAlunoService,
    private readonly deleteAlunoService: DeleteAlunoService,
    private readonly createEnrollmentService: CreateEnrollmentService,
    private readonly findEnrollmentService: FindEnrollmentService,
  ) {}

  @Post()
  async create(@Body() createAlunoDto: CreateAlunoDto, @CurrentUser() user: any) {
    return this.createAlunoService.execute(createAlunoDto, user.organizationId || user.id);
  }

  @Post('enrollments')
  async createEnrollment(@Body() dto: any, @CurrentUser() user: any) {
    return this.createEnrollmentService.execute(dto, user.organizationId || user.id);
  }

  @Get(':studentId/enrollments')
  async getEnrollments(@Param('studentId') studentId: string) {
    return this.findEnrollmentService.findByStudent(studentId);
  }

  @Get()
  async findAll(
    @Query('schoolId') schoolId: string,
    @Query('classGroupId') classGroupId: string,
    @Query('statusFilter') statusFilter: string,
    @Query('searchTerm') searchTerm: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.findAlunoService.findAll({
      schoolId,
      classGroupId,
      statusFilter,
      searchTerm,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 25,
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAlunoDto: UpdateAlunoDto,
    @CurrentUser() user: any,
  ) {
    // Assuming organization_id is in user payload or user.id maps to organization via some logic
    // For now we pass user.organizationId or fallback
    return this.updateAlunoService.execute(id, updateAlunoDto, user.organizationId || user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteAlunoService.execute(id, user.organizationId || user.id);
  }
}
