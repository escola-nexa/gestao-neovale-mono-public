import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialChargeRules } from './entities/financial_charge_rules.entity';
import { FinancialChargeRulesController } from './controllers/financial_charge_rules.controller';
import { FindFinancialChargeRulesService } from './services/find-financial_charge_rules.service';
import { CreateFinancialChargeRulesService } from './services/create-financial_charge_rules.service';
import { UpdateFinancialChargeRulesService } from './services/update-financial_charge_rules.service';
import { DeleteFinancialChargeRulesService } from './services/delete-financial_charge_rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialChargeRules])],
  controllers: [FinancialChargeRulesController],
  providers: [
    FindFinancialChargeRulesService,
    CreateFinancialChargeRulesService,
    UpdateFinancialChargeRulesService,
    DeleteFinancialChargeRulesService,
  ],
  exports: [FindFinancialChargeRulesService],
})
export class FinancialChargeRulesModule {}
