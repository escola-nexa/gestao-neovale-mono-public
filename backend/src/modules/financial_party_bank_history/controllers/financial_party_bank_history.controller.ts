import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPartyBankHistoryDto } from '../dto/create-financial_party_bank_history.dto';
import { UpdateFinancialPartyBankHistoryDto } from '../dto/update-financial_party_bank_history.dto';
import { FindFinancialPartyBankHistoryService } from '../services/find-financial_party_bank_history.service';
import { CreateFinancialPartyBankHistoryService } from '../services/create-financial_party_bank_history.service';
import { UpdateFinancialPartyBankHistoryService } from '../services/update-financial_party_bank_history.service';
import { DeleteFinancialPartyBankHistoryService } from '../services/delete-financial_party_bank_history.service';

@Controller('financial-party-bank-history')
@UseGuards(JwtAuthGuard)
export class FinancialPartyBankHistoryController {
  constructor(
    private readonly findService: FindFinancialPartyBankHistoryService,
    private readonly createService: CreateFinancialPartyBankHistoryService,
    private readonly updateService: UpdateFinancialPartyBankHistoryService,
    private readonly deleteService: DeleteFinancialPartyBankHistoryService,
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
  async create(@Body() dto: CreateFinancialPartyBankHistoryDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPartyBankHistoryDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
