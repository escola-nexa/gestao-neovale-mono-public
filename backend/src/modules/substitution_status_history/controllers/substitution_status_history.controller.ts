import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSubstitutionStatusHistoryDto } from '../dto/create-substitution_status_history.dto';
import { UpdateSubstitutionStatusHistoryDto } from '../dto/update-substitution_status_history.dto';
import { FindSubstitutionStatusHistoryService } from '../services/find-substitution_status_history.service';
import { CreateSubstitutionStatusHistoryService } from '../services/create-substitution_status_history.service';
import { UpdateSubstitutionStatusHistoryService } from '../services/update-substitution_status_history.service';
import { DeleteSubstitutionStatusHistoryService } from '../services/delete-substitution_status_history.service';

@Controller('substitution-status-history')
@UseGuards(JwtAuthGuard)
export class SubstitutionStatusHistoryController {
  constructor(
    private readonly findService: FindSubstitutionStatusHistoryService,
    private readonly createService: CreateSubstitutionStatusHistoryService,
    private readonly updateService: UpdateSubstitutionStatusHistoryService,
    private readonly deleteService: DeleteSubstitutionStatusHistoryService,
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
  async create(@Body() dto: CreateSubstitutionStatusHistoryDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubstitutionStatusHistoryDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
