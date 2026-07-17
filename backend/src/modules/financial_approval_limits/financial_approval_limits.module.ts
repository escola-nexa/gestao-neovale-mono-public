import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialApprovalLimits } from './entities/financial_approval_limits.entity';
import { FinancialApprovalLimitsController } from './controllers/financial_approval_limits.controller';
import { FindFinancialApprovalLimitsService } from './services/find-financial_approval_limits.service';
import { CreateFinancialApprovalLimitsService } from './services/create-financial_approval_limits.service';
import { UpdateFinancialApprovalLimitsService } from './services/update-financial_approval_limits.service';
import { DeleteFinancialApprovalLimitsService } from './services/delete-financial_approval_limits.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialApprovalLimits])],
  controllers: [FinancialApprovalLimitsController],
  providers: [
    FindFinancialApprovalLimitsService,
    CreateFinancialApprovalLimitsService,
    UpdateFinancialApprovalLimitsService,
    DeleteFinancialApprovalLimitsService,
  ],
  exports: [FindFinancialApprovalLimitsService],
})
export class FinancialApprovalLimitsModule {}
