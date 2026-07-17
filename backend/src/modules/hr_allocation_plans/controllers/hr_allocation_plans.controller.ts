import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrAllocationPlansDto } from '../dto/create-hr_allocation_plans.dto';
import { UpdateHrAllocationPlansDto } from '../dto/update-hr_allocation_plans.dto';
import { FindHrAllocationPlansService } from '../services/find-hr_allocation_plans.service';
import { CreateHrAllocationPlansService } from '../services/create-hr_allocation_plans.service';
import { UpdateHrAllocationPlansService } from '../services/update-hr_allocation_plans.service';
import { DeleteHrAllocationPlansService } from '../services/delete-hr_allocation_plans.service';

@Controller('hr-allocation-plans')
@UseGuards(JwtAuthGuard)
export class HrAllocationPlansController {
  constructor(
    private readonly findService: FindHrAllocationPlansService,
    private readonly createService: CreateHrAllocationPlansService,
    private readonly updateService: UpdateHrAllocationPlansService,
    private readonly deleteService: DeleteHrAllocationPlansService,
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
  async create(@Body() dto: CreateHrAllocationPlansDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrAllocationPlansDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
