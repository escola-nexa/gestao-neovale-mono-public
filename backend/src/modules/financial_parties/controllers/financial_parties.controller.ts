import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPartiesDto } from '../dto/create-financial_parties.dto';
import { UpdateFinancialPartiesDto } from '../dto/update-financial_parties.dto';
import { FindFinancialPartiesService } from '../services/find-financial_parties.service';
import { CreateFinancialPartiesService } from '../services/create-financial_parties.service';
import { UpdateFinancialPartiesService } from '../services/update-financial_parties.service';
import { DeleteFinancialPartiesService } from '../services/delete-financial_parties.service';

@Controller('financial-parties')
@UseGuards(JwtAuthGuard)
export class FinancialPartiesController {
  constructor(
    private readonly findService: FindFinancialPartiesService,
    private readonly createService: CreateFinancialPartiesService,
    private readonly updateService: UpdateFinancialPartiesService,
    private readonly deleteService: DeleteFinancialPartiesService,
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
  async create(@Body() dto: CreateFinancialPartiesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPartiesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
