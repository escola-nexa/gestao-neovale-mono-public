import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPeriodClosuresDto } from '../dto/create-financial_period_closures.dto';
import { UpdateFinancialPeriodClosuresDto } from '../dto/update-financial_period_closures.dto';
import { FindFinancialPeriodClosuresService } from '../services/find-financial_period_closures.service';
import { CreateFinancialPeriodClosuresService } from '../services/create-financial_period_closures.service';
import { UpdateFinancialPeriodClosuresService } from '../services/update-financial_period_closures.service';
import { DeleteFinancialPeriodClosuresService } from '../services/delete-financial_period_closures.service';

@Controller('financial-period-closures')
@UseGuards(JwtAuthGuard)
export class FinancialPeriodClosuresController {
  constructor(
    private readonly findService: FindFinancialPeriodClosuresService,
    private readonly createService: CreateFinancialPeriodClosuresService,
    private readonly updateService: UpdateFinancialPeriodClosuresService,
    private readonly deleteService: DeleteFinancialPeriodClosuresService,
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
  async create(@Body() dto: CreateFinancialPeriodClosuresDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPeriodClosuresDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
