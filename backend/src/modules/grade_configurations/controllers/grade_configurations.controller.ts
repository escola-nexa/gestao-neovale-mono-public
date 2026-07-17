import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateGradeConfigurationsDto } from '../dto/create-grade_configurations.dto';
import { UpdateGradeConfigurationsDto } from '../dto/update-grade_configurations.dto';
import { FindGradeConfigurationsService } from '../services/find-grade_configurations.service';
import { CreateGradeConfigurationsService } from '../services/create-grade_configurations.service';
import { UpdateGradeConfigurationsService } from '../services/update-grade_configurations.service';
import { DeleteGradeConfigurationsService } from '../services/delete-grade_configurations.service';

@Controller('grade-configurations')
@UseGuards(JwtAuthGuard)
export class GradeConfigurationsController {
  constructor(
    private readonly findService: FindGradeConfigurationsService,
    private readonly createService: CreateGradeConfigurationsService,
    private readonly updateService: UpdateGradeConfigurationsService,
    private readonly deleteService: DeleteGradeConfigurationsService,
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
  async create(@Body() dto: CreateGradeConfigurationsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGradeConfigurationsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
