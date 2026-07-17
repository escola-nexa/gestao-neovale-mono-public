import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorStatusHistoryDto } from '../dto/create-professor_status_history.dto';
import { UpdateProfessorStatusHistoryDto } from '../dto/update-professor_status_history.dto';
import { FindProfessorStatusHistoryService } from '../services/find-professor_status_history.service';
import { CreateProfessorStatusHistoryService } from '../services/create-professor_status_history.service';
import { UpdateProfessorStatusHistoryService } from '../services/update-professor_status_history.service';
import { DeleteProfessorStatusHistoryService } from '../services/delete-professor_status_history.service';

@Controller('professor-status-history')
@UseGuards(JwtAuthGuard)
export class ProfessorStatusHistoryController {
  constructor(
    private readonly findService: FindProfessorStatusHistoryService,
    private readonly createService: CreateProfessorStatusHistoryService,
    private readonly updateService: UpdateProfessorStatusHistoryService,
    private readonly deleteService: DeleteProfessorStatusHistoryService,
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
  async create(@Body() dto: CreateProfessorStatusHistoryDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorStatusHistoryDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
