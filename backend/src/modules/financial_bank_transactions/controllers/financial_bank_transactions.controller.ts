import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialBankTransactionsDto } from '../dto/create-financial_bank_transactions.dto';
import { UpdateFinancialBankTransactionsDto } from '../dto/update-financial_bank_transactions.dto';
import { FindFinancialBankTransactionsService } from '../services/find-financial_bank_transactions.service';
import { CreateFinancialBankTransactionsService } from '../services/create-financial_bank_transactions.service';
import { UpdateFinancialBankTransactionsService } from '../services/update-financial_bank_transactions.service';
import { DeleteFinancialBankTransactionsService } from '../services/delete-financial_bank_transactions.service';

@Controller('financial-bank-transactions')
@UseGuards(JwtAuthGuard)
export class FinancialBankTransactionsController {
  constructor(
    private readonly findService: FindFinancialBankTransactionsService,
    private readonly createService: CreateFinancialBankTransactionsService,
    private readonly updateService: UpdateFinancialBankTransactionsService,
    private readonly deleteService: DeleteFinancialBankTransactionsService,
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
  async create(@Body() dto: CreateFinancialBankTransactionsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialBankTransactionsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
