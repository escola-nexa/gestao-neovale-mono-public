import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreatePrePlanningMaterialsDto } from '../dto/create-pre_planning_materials.dto';
import { UpdatePrePlanningMaterialsDto } from '../dto/update-pre_planning_materials.dto';
import { FindPrePlanningMaterialsService } from '../services/find-pre_planning_materials.service';
import { CreatePrePlanningMaterialsService } from '../services/create-pre_planning_materials.service';
import { UpdatePrePlanningMaterialsService } from '../services/update-pre_planning_materials.service';
import { DeletePrePlanningMaterialsService } from '../services/delete-pre_planning_materials.service';

@Controller('pre-planning-materials')
@UseGuards(JwtAuthGuard)
export class PrePlanningMaterialsController {
  constructor(
    private readonly findService: FindPrePlanningMaterialsService,
    private readonly createService: CreatePrePlanningMaterialsService,
    private readonly updateService: UpdatePrePlanningMaterialsService,
    private readonly deleteService: DeletePrePlanningMaterialsService,
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
  async create(@Body() dto: CreatePrePlanningMaterialsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePrePlanningMaterialsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
