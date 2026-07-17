import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorKanbanStateDto } from '../dto/create-professor_kanban_state.dto';
import { UpdateProfessorKanbanStateDto } from '../dto/update-professor_kanban_state.dto';
import { FindProfessorKanbanStateService } from '../services/find-professor_kanban_state.service';
import { CreateProfessorKanbanStateService } from '../services/create-professor_kanban_state.service';
import { UpdateProfessorKanbanStateService } from '../services/update-professor_kanban_state.service';
import { DeleteProfessorKanbanStateService } from '../services/delete-professor_kanban_state.service';

@Controller('professor-kanban-state')
@UseGuards(JwtAuthGuard)
export class ProfessorKanbanStateController {
  constructor(
    private readonly findService: FindProfessorKanbanStateService,
    private readonly createService: CreateProfessorKanbanStateService,
    private readonly updateService: UpdateProfessorKanbanStateService,
    private readonly deleteService: DeleteProfessorKanbanStateService,
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
  async create(@Body() dto: CreateProfessorKanbanStateDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorKanbanStateDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
