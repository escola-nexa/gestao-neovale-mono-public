import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPartyBankAccountsDto } from '../dto/create-financial_party_bank_accounts.dto';
import { UpdateFinancialPartyBankAccountsDto } from '../dto/update-financial_party_bank_accounts.dto';
import { FindFinancialPartyBankAccountsService } from '../services/find-financial_party_bank_accounts.service';
import { CreateFinancialPartyBankAccountsService } from '../services/create-financial_party_bank_accounts.service';
import { UpdateFinancialPartyBankAccountsService } from '../services/update-financial_party_bank_accounts.service';
import { DeleteFinancialPartyBankAccountsService } from '../services/delete-financial_party_bank_accounts.service';

@Controller('financial-party-bank-accounts')
@UseGuards(JwtAuthGuard)
export class FinancialPartyBankAccountsController {
  constructor(
    private readonly findService: FindFinancialPartyBankAccountsService,
    private readonly createService: CreateFinancialPartyBankAccountsService,
    private readonly updateService: UpdateFinancialPartyBankAccountsService,
    private readonly deleteService: DeleteFinancialPartyBankAccountsService,
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
  async create(@Body() dto: CreateFinancialPartyBankAccountsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPartyBankAccountsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
