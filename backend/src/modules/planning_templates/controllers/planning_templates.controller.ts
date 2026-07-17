import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreatePlanningTemplatesDto } from '../dto/create-planning_templates.dto';
import { UpdatePlanningTemplatesDto } from '../dto/update-planning_templates.dto';
import { FindPlanningTemplatesService } from '../services/find-planning_templates.service';
import { CreatePlanningTemplatesService } from '../services/create-planning_templates.service';
import { UpdatePlanningTemplatesService } from '../services/update-planning_templates.service';
import { DeletePlanningTemplatesService } from '../services/delete-planning_templates.service';

@Controller('planning-templates')
@UseGuards(JwtAuthGuard)
export class PlanningTemplatesController {
  constructor(
    private readonly findService: FindPlanningTemplatesService,
    private readonly createService: CreatePlanningTemplatesService,
    private readonly updateService: UpdatePlanningTemplatesService,
    private readonly deleteService: DeletePlanningTemplatesService,
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
  async create(@Body() dto: CreatePlanningTemplatesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanningTemplatesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
