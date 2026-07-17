import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorUnbindingHistoryDto } from '../dto/create-professor_unbinding_history.dto';
import { UpdateProfessorUnbindingHistoryDto } from '../dto/update-professor_unbinding_history.dto';
import { FindProfessorUnbindingHistoryService } from '../services/find-professor_unbinding_history.service';
import { CreateProfessorUnbindingHistoryService } from '../services/create-professor_unbinding_history.service';
import { UpdateProfessorUnbindingHistoryService } from '../services/update-professor_unbinding_history.service';
import { DeleteProfessorUnbindingHistoryService } from '../services/delete-professor_unbinding_history.service';

@Controller('professor-unbinding-history')
@UseGuards(JwtAuthGuard)
export class ProfessorUnbindingHistoryController {
  constructor(
    private readonly findService: FindProfessorUnbindingHistoryService,
    private readonly createService: CreateProfessorUnbindingHistoryService,
    private readonly updateService: UpdateProfessorUnbindingHistoryService,
    private readonly deleteService: DeleteProfessorUnbindingHistoryService,
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
  async create(@Body() dto: CreateProfessorUnbindingHistoryDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorUnbindingHistoryDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
