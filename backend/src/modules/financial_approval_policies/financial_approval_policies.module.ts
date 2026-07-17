import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialApprovalPolicies } from './entities/financial_approval_policies.entity';
import { FinancialApprovalPoliciesController } from './controllers/financial_approval_policies.controller';
import { FindFinancialApprovalPoliciesService } from './services/find-financial_approval_policies.service';
import { CreateFinancialApprovalPoliciesService } from './services/create-financial_approval_policies.service';
import { UpdateFinancialApprovalPoliciesService } from './services/update-financial_approval_policies.service';
import { DeleteFinancialApprovalPoliciesService } from './services/delete-financial_approval_policies.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialApprovalPolicies])],
  controllers: [FinancialApprovalPoliciesController],
  providers: [
    FindFinancialApprovalPoliciesService,
    CreateFinancialApprovalPoliciesService,
    UpdateFinancialApprovalPoliciesService,
    DeleteFinancialApprovalPoliciesService,
  ],
  exports: [FindFinancialApprovalPoliciesService],
})
export class FinancialApprovalPoliciesModule {}
