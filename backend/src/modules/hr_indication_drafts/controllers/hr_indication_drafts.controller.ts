import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrIndicationDraftsDto } from '../dto/create-hr_indication_drafts.dto';
import { UpdateHrIndicationDraftsDto } from '../dto/update-hr_indication_drafts.dto';
import { FindHrIndicationDraftsService } from '../services/find-hr_indication_drafts.service';
import { CreateHrIndicationDraftsService } from '../services/create-hr_indication_drafts.service';
import { UpdateHrIndicationDraftsService } from '../services/update-hr_indication_drafts.service';
import { DeleteHrIndicationDraftsService } from '../services/delete-hr_indication_drafts.service';

@Controller('hr-indication-drafts')
@UseGuards(JwtAuthGuard)
export class HrIndicationDraftsController {
  constructor(
    private readonly findService: FindHrIndicationDraftsService,
    private readonly createService: CreateHrIndicationDraftsService,
    private readonly updateService: UpdateHrIndicationDraftsService,
    private readonly deleteService: DeleteHrIndicationDraftsService,
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
  async create(@Body() dto: CreateHrIndicationDraftsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrIndicationDraftsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
