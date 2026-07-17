import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorContactLogsDto } from '../dto/create-professor_contact_logs.dto';
import { UpdateProfessorContactLogsDto } from '../dto/update-professor_contact_logs.dto';
import { FindProfessorContactLogsService } from '../services/find-professor_contact_logs.service';
import { CreateProfessorContactLogsService } from '../services/create-professor_contact_logs.service';
import { UpdateProfessorContactLogsService } from '../services/update-professor_contact_logs.service';
import { DeleteProfessorContactLogsService } from '../services/delete-professor_contact_logs.service';

@Controller('professor-contact-logs')
@UseGuards(JwtAuthGuard)
export class ProfessorContactLogsController {
  constructor(
    private readonly findService: FindProfessorContactLogsService,
    private readonly createService: CreateProfessorContactLogsService,
    private readonly updateService: UpdateProfessorContactLogsService,
    private readonly deleteService: DeleteProfessorContactLogsService,
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
  async create(@Body() dto: CreateProfessorContactLogsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorContactLogsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
