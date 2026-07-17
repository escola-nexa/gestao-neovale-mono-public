import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateWeeklyTeachingModelsDto } from '../dto/create-weekly_teaching_models.dto';
import { UpdateWeeklyTeachingModelsDto } from '../dto/update-weekly_teaching_models.dto';
import { FindWeeklyTeachingModelsService } from '../services/find-weekly_teaching_models.service';
import { CreateWeeklyTeachingModelsService } from '../services/create-weekly_teaching_models.service';
import { UpdateWeeklyTeachingModelsService } from '../services/update-weekly_teaching_models.service';
import { DeleteWeeklyTeachingModelsService } from '../services/delete-weekly_teaching_models.service';

@Controller('weekly-teaching-models')
@UseGuards(JwtAuthGuard)
export class WeeklyTeachingModelsController {
  constructor(
    private readonly findService: FindWeeklyTeachingModelsService,
    private readonly createService: CreateWeeklyTeachingModelsService,
    private readonly updateService: UpdateWeeklyTeachingModelsService,
    private readonly deleteService: DeleteWeeklyTeachingModelsService,
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
  async create(@Body() dto: CreateWeeklyTeachingModelsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWeeklyTeachingModelsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
