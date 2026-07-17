import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPeriodClosures } from './entities/financial_period_closures.entity';
import { FinancialPeriodClosuresController } from './controllers/financial_period_closures.controller';
import { FindFinancialPeriodClosuresService } from './services/find-financial_period_closures.service';
import { CreateFinancialPeriodClosuresService } from './services/create-financial_period_closures.service';
import { UpdateFinancialPeriodClosuresService } from './services/update-financial_period_closures.service';
import { DeleteFinancialPeriodClosuresService } from './services/delete-financial_period_closures.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPeriodClosures])],
  controllers: [FinancialPeriodClosuresController],
  providers: [
    FindFinancialPeriodClosuresService,
    CreateFinancialPeriodClosuresService,
    UpdateFinancialPeriodClosuresService,
    DeleteFinancialPeriodClosuresService,
  ],
  exports: [FindFinancialPeriodClosuresService],
})
export class FinancialPeriodClosuresModule {}
