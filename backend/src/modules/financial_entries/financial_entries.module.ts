import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialEntries } from './entities/financial_entries.entity';
import { FinancialEntriesController } from './controllers/financial_entries.controller';
import { FindFinancialEntriesService } from './services/find-financial_entries.service';
import { CreateFinancialEntriesService } from './services/create-financial_entries.service';
import { UpdateFinancialEntriesService } from './services/update-financial_entries.service';
import { DeleteFinancialEntriesService } from './services/delete-financial_entries.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialEntries])],
  controllers: [FinancialEntriesController],
  providers: [
    FindFinancialEntriesService,
    CreateFinancialEntriesService,
    UpdateFinancialEntriesService,
    DeleteFinancialEntriesService,
  ],
  exports: [FindFinancialEntriesService],
})
export class FinancialEntriesModule {}
