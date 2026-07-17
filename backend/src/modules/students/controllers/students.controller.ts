import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateStudentsDto } from '../dto/create-students.dto';
import { UpdateStudentsDto } from '../dto/update-students.dto';
import { FindStudentsService } from '../services/find-students.service';
import { CreateStudentsService } from '../services/create-students.service';
import { UpdateStudentsService } from '../services/update-students.service';
import { DeleteStudentsService } from '../services/delete-students.service';
import { StudentsExtendedService } from '../services/extended-students.service';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(
    private readonly findService: FindStudentsService,
    private readonly createService: CreateStudentsService,
    private readonly updateService: UpdateStudentsService,
    private readonly deleteService: DeleteStudentsService,
    private readonly extendedService: StudentsExtendedService,
  ) {}

  @Get('duplicates')
  async getDuplicates(@CurrentUser() user: any) {
    return this.extendedService.getStudentDuplicates(user.organizationId || user.organization_id);
  }

  @Get('import-conflicts')
  async getImportConflicts(@CurrentUser() user: any) {
    return this.extendedService.getStudentImportConflicts(user.organizationId || user.organization_id);
  }

  @Post('search')
  async search(@Body() body: any, @CurrentUser() user: any) {
    return this.extendedService.searchStudents(user.organizationId || user.organization_id, body.query);
  }

  @Get('import-batches')
  async getImportBatches(@CurrentUser() user: any) {
    return this.extendedService.getImportBatches(user.organizationId || user.organization_id);
  }

  @Post('import-batches')
  async createImportBatch(@Body() body: any) {
    return this.extendedService.createImportBatch(body);
  }

  @Get('import-batches/:id/rows')
  async getImportBatchRows(@Param('id') id: string) {
    return this.extendedService.getImportBatchRows(id);
  }

  @Patch('import-batches/:id')
  async updateImportBatch(@Param('id') id: string, @Body() body: any) {
    return this.extendedService.updateImportBatch(id, body);
  }

  @Post('import-batch-rows')
  async insertImportRows(@Body() body: any[]) {
    return this.extendedService.insertImportRows(body);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateStudentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStudentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
