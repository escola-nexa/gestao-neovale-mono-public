import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorKanbanLabelsDto } from '../dto/create-professor_kanban_labels.dto';
import { UpdateProfessorKanbanLabelsDto } from '../dto/update-professor_kanban_labels.dto';
import { FindProfessorKanbanLabelsService } from '../services/find-professor_kanban_labels.service';
import { CreateProfessorKanbanLabelsService } from '../services/create-professor_kanban_labels.service';
import { UpdateProfessorKanbanLabelsService } from '../services/update-professor_kanban_labels.service';
import { DeleteProfessorKanbanLabelsService } from '../services/delete-professor_kanban_labels.service';

@Controller('professor-kanban-labels')
@UseGuards(JwtAuthGuard)
export class ProfessorKanbanLabelsController {
  constructor(
    private readonly findService: FindProfessorKanbanLabelsService,
    private readonly createService: CreateProfessorKanbanLabelsService,
    private readonly updateService: UpdateProfessorKanbanLabelsService,
    private readonly deleteService: DeleteProfessorKanbanLabelsService,
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
  async create(@Body() dto: CreateProfessorKanbanLabelsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorKanbanLabelsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
