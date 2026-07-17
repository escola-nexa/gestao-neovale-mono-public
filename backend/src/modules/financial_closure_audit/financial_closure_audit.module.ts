import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialClosureAudit } from './entities/financial_closure_audit.entity';
import { FinancialClosureAuditController } from './controllers/financial_closure_audit.controller';
import { FindFinancialClosureAuditService } from './services/find-financial_closure_audit.service';
import { CreateFinancialClosureAuditService } from './services/create-financial_closure_audit.service';
import { UpdateFinancialClosureAuditService } from './services/update-financial_closure_audit.service';
import { DeleteFinancialClosureAuditService } from './services/delete-financial_closure_audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialClosureAudit])],
  controllers: [FinancialClosureAuditController],
  providers: [
    FindFinancialClosureAuditService,
    CreateFinancialClosureAuditService,
    UpdateFinancialClosureAuditService,
    DeleteFinancialClosureAuditService,
  ],
  exports: [FindFinancialClosureAuditService],
})
export class FinancialClosureAuditModule {}
