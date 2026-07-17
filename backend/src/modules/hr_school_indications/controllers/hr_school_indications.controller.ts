import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrSchoolIndicationsDto } from '../dto/create-hr_school_indications.dto';
import { UpdateHrSchoolIndicationsDto } from '../dto/update-hr_school_indications.dto';
import { FindHrSchoolIndicationsService } from '../services/find-hr_school_indications.service';
import { CreateHrSchoolIndicationsService } from '../services/create-hr_school_indications.service';
import { UpdateHrSchoolIndicationsService } from '../services/update-hr_school_indications.service';
import { DeleteHrSchoolIndicationsService } from '../services/delete-hr_school_indications.service';

@Controller('hr-school-indications')
@UseGuards(JwtAuthGuard)
export class HrSchoolIndicationsController {
  constructor(
    private readonly findService: FindHrSchoolIndicationsService,
    private readonly createService: CreateHrSchoolIndicationsService,
    private readonly updateService: UpdateHrSchoolIndicationsService,
    private readonly deleteService: DeleteHrSchoolIndicationsService,
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
  async create(@Body() dto: CreateHrSchoolIndicationsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrSchoolIndicationsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
