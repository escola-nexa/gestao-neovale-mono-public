import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialAccountsDto } from '../dto/create-financial_accounts.dto';
import { UpdateFinancialAccountsDto } from '../dto/update-financial_accounts.dto';
import { FindFinancialAccountsService } from '../services/find-financial_accounts.service';
import { CreateFinancialAccountsService } from '../services/create-financial_accounts.service';
import { UpdateFinancialAccountsService } from '../services/update-financial_accounts.service';
import { DeleteFinancialAccountsService } from '../services/delete-financial_accounts.service';

@Controller('financial-accounts')
@UseGuards(JwtAuthGuard)
export class FinancialAccountsController {
  constructor(
    private readonly findService: FindFinancialAccountsService,
    private readonly createService: CreateFinancialAccountsService,
    private readonly updateService: UpdateFinancialAccountsService,
    private readonly deleteService: DeleteFinancialAccountsService,
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
  async create(@Body() dto: CreateFinancialAccountsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialAccountsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
