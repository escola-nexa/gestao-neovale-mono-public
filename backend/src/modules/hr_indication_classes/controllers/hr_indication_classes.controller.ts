import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrIndicationClassesDto } from '../dto/create-hr_indication_classes.dto';
import { UpdateHrIndicationClassesDto } from '../dto/update-hr_indication_classes.dto';
import { FindHrIndicationClassesService } from '../services/find-hr_indication_classes.service';
import { CreateHrIndicationClassesService } from '../services/create-hr_indication_classes.service';
import { UpdateHrIndicationClassesService } from '../services/update-hr_indication_classes.service';
import { DeleteHrIndicationClassesService } from '../services/delete-hr_indication_classes.service';

@Controller('hr-indication-classes')
@UseGuards(JwtAuthGuard)
export class HrIndicationClassesController {
  constructor(
    private readonly findService: FindHrIndicationClassesService,
    private readonly createService: CreateHrIndicationClassesService,
    private readonly updateService: UpdateHrIndicationClassesService,
    private readonly deleteService: DeleteHrIndicationClassesService,
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
  async create(@Body() dto: CreateHrIndicationClassesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrIndicationClassesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
