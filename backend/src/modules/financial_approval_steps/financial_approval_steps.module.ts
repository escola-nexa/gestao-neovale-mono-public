import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialApprovalSteps } from './entities/financial_approval_steps.entity';
import { FinancialApprovalStepsController } from './controllers/financial_approval_steps.controller';
import { FindFinancialApprovalStepsService } from './services/find-financial_approval_steps.service';
import { CreateFinancialApprovalStepsService } from './services/create-financial_approval_steps.service';
import { UpdateFinancialApprovalStepsService } from './services/update-financial_approval_steps.service';
import { DeleteFinancialApprovalStepsService } from './services/delete-financial_approval_steps.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialApprovalSteps])],
  controllers: [FinancialApprovalStepsController],
  providers: [
    FindFinancialApprovalStepsService,
    CreateFinancialApprovalStepsService,
    UpdateFinancialApprovalStepsService,
    DeleteFinancialApprovalStepsService,
  ],
  exports: [FindFinancialApprovalStepsService],
})
export class FinancialApprovalStepsModule {}
