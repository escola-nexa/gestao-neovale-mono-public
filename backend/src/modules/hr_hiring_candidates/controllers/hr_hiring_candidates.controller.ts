import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrHiringCandidatesDto } from '../dto/create-hr_hiring_candidates.dto';
import { UpdateHrHiringCandidatesDto } from '../dto/update-hr_hiring_candidates.dto';
import { FindHrHiringCandidatesService } from '../services/find-hr_hiring_candidates.service';
import { CreateHrHiringCandidatesService } from '../services/create-hr_hiring_candidates.service';
import { UpdateHrHiringCandidatesService } from '../services/update-hr_hiring_candidates.service';
import { DeleteHrHiringCandidatesService } from '../services/delete-hr_hiring_candidates.service';

@Controller('hr-hiring-candidates')
@UseGuards(JwtAuthGuard)
export class HrHiringCandidatesController {
  constructor(
    private readonly findService: FindHrHiringCandidatesService,
    private readonly createService: CreateHrHiringCandidatesService,
    private readonly updateService: UpdateHrHiringCandidatesService,
    private readonly deleteService: DeleteHrHiringCandidatesService,
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
  async create(@Body() dto: CreateHrHiringCandidatesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrHiringCandidatesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
