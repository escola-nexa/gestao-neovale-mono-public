import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSubstitutionRequestsDto } from '../dto/create-substitution_requests.dto';
import { UpdateSubstitutionRequestsDto } from '../dto/update-substitution_requests.dto';
import { FindSubstitutionRequestsService } from '../services/find-substitution_requests.service';
import { CreateSubstitutionRequestsService } from '../services/create-substitution_requests.service';
import { UpdateSubstitutionRequestsService } from '../services/update-substitution_requests.service';
import { DeleteSubstitutionRequestsService } from '../services/delete-substitution_requests.service';

@Controller('substitution-requests')
@UseGuards(JwtAuthGuard)
export class SubstitutionRequestsController {
  constructor(
    private readonly findService: FindSubstitutionRequestsService,
    private readonly createService: CreateSubstitutionRequestsService,
    private readonly updateService: UpdateSubstitutionRequestsService,
    private readonly deleteService: DeleteSubstitutionRequestsService,
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
  async create(@Body() dto: CreateSubstitutionRequestsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubstitutionRequestsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
