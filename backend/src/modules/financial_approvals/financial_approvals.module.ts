import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialApprovals } from './entities/financial_approvals.entity';
import { FinancialApprovalsController } from './controllers/financial_approvals.controller';
import { FindFinancialApprovalsService } from './services/find-financial_approvals.service';
import { CreateFinancialApprovalsService } from './services/create-financial_approvals.service';
import { UpdateFinancialApprovalsService } from './services/update-financial_approvals.service';
import { DeleteFinancialApprovalsService } from './services/delete-financial_approvals.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialApprovals])],
  controllers: [FinancialApprovalsController],
  providers: [
    FindFinancialApprovalsService,
    CreateFinancialApprovalsService,
    UpdateFinancialApprovalsService,
    DeleteFinancialApprovalsService,
  ],
  exports: [FindFinancialApprovalsService],
})
export class FinancialApprovalsModule {}
