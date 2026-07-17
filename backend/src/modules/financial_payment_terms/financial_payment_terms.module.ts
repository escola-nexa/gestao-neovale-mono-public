import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPaymentTerms } from './entities/financial_payment_terms.entity';
import { FinancialPaymentTermsController } from './controllers/financial_payment_terms.controller';
import { FindFinancialPaymentTermsService } from './services/find-financial_payment_terms.service';
import { CreateFinancialPaymentTermsService } from './services/create-financial_payment_terms.service';
import { UpdateFinancialPaymentTermsService } from './services/update-financial_payment_terms.service';
import { DeleteFinancialPaymentTermsService } from './services/delete-financial_payment_terms.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPaymentTerms])],
  controllers: [FinancialPaymentTermsController],
  providers: [
    FindFinancialPaymentTermsService,
    CreateFinancialPaymentTermsService,
    UpdateFinancialPaymentTermsService,
    DeleteFinancialPaymentTermsService,
  ],
  exports: [FindFinancialPaymentTermsService],
})
export class FinancialPaymentTermsModule {}
