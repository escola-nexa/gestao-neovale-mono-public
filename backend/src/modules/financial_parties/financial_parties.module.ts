import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialParties } from './entities/financial_parties.entity';
import { FinancialPartiesController } from './controllers/financial_parties.controller';
import { FindFinancialPartiesService } from './services/find-financial_parties.service';
import { CreateFinancialPartiesService } from './services/create-financial_parties.service';
import { UpdateFinancialPartiesService } from './services/update-financial_parties.service';
import { DeleteFinancialPartiesService } from './services/delete-financial_parties.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialParties])],
  controllers: [FinancialPartiesController],
  providers: [
    FindFinancialPartiesService,
    CreateFinancialPartiesService,
    UpdateFinancialPartiesService,
    DeleteFinancialPartiesService,
  ],
  exports: [FindFinancialPartiesService],
})
export class FinancialPartiesModule {}
