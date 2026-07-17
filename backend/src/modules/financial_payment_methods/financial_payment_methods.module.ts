import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPaymentMethods } from './entities/financial_payment_methods.entity';
import { FinancialPaymentMethodsController } from './controllers/financial_payment_methods.controller';
import { FindFinancialPaymentMethodsService } from './services/find-financial_payment_methods.service';
import { CreateFinancialPaymentMethodsService } from './services/create-financial_payment_methods.service';
import { UpdateFinancialPaymentMethodsService } from './services/update-financial_payment_methods.service';
import { DeleteFinancialPaymentMethodsService } from './services/delete-financial_payment_methods.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPaymentMethods])],
  controllers: [FinancialPaymentMethodsController],
  providers: [
    FindFinancialPaymentMethodsService,
    CreateFinancialPaymentMethodsService,
    UpdateFinancialPaymentMethodsService,
    DeleteFinancialPaymentMethodsService,
  ],
  exports: [FindFinancialPaymentMethodsService],
})
export class FinancialPaymentMethodsModule {}
