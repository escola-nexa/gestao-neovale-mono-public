import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTalentPoolCandidatesDto } from '../dto/create-talent_pool_candidates.dto';
import { UpdateTalentPoolCandidatesDto } from '../dto/update-talent_pool_candidates.dto';
import { FindTalentPoolCandidatesService } from '../services/find-talent_pool_candidates.service';
import { CreateTalentPoolCandidatesService } from '../services/create-talent_pool_candidates.service';
import { UpdateTalentPoolCandidatesService } from '../services/update-talent_pool_candidates.service';
import { DeleteTalentPoolCandidatesService } from '../services/delete-talent_pool_candidates.service';

@Controller('talent-pool-candidates')
@UseGuards(JwtAuthGuard)
export class TalentPoolCandidatesController {
  constructor(
    private readonly findService: FindTalentPoolCandidatesService,
    private readonly createService: CreateTalentPoolCandidatesService,
    private readonly updateService: UpdateTalentPoolCandidatesService,
    private readonly deleteService: DeleteTalentPoolCandidatesService,
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
  async create(@Body() dto: CreateTalentPoolCandidatesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTalentPoolCandidatesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
