import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateKanbanListsDto } from '../dto/create-kanban_lists.dto';
import { UpdateKanbanListsDto } from '../dto/update-kanban_lists.dto';
import { FindKanbanListsService } from '../services/find-kanban_lists.service';
import { CreateKanbanListsService } from '../services/create-kanban_lists.service';
import { UpdateKanbanListsService } from '../services/update-kanban_lists.service';
import { DeleteKanbanListsService } from '../services/delete-kanban_lists.service';

@Controller('kanban-lists')
@UseGuards(JwtAuthGuard)
export class KanbanListsController {
  constructor(
    private readonly findService: FindKanbanListsService,
    private readonly createService: CreateKanbanListsService,
    private readonly updateService: UpdateKanbanListsService,
    private readonly deleteService: DeleteKanbanListsService,
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
  async create(@Body() dto: CreateKanbanListsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateKanbanListsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
