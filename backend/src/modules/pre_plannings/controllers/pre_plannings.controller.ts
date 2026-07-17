import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreatePrePlanningsDto } from '../dto/create-pre_plannings.dto';
import { UpdatePrePlanningsDto } from '../dto/update-pre_plannings.dto';
import { FindPrePlanningsService } from '../services/find-pre_plannings.service';
import { CreatePrePlanningsService } from '../services/create-pre_plannings.service';
import { UpdatePrePlanningsService } from '../services/update-pre_plannings.service';
import { DeletePrePlanningsService } from '../services/delete-pre_plannings.service';

@Controller('pre-plannings')
@UseGuards(JwtAuthGuard)
export class PrePlanningsController {
  constructor(
    private readonly findService: FindPrePlanningsService,
    private readonly createService: CreatePrePlanningsService,
    private readonly updateService: UpdatePrePlanningsService,
    private readonly deleteService: DeletePrePlanningsService,
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
  async create(@Body() dto: CreatePrePlanningsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePrePlanningsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
