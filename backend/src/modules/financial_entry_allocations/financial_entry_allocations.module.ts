import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialEntryAllocations } from './entities/financial_entry_allocations.entity';
import { FinancialEntryAllocationsController } from './controllers/financial_entry_allocations.controller';
import { FindFinancialEntryAllocationsService } from './services/find-financial_entry_allocations.service';
import { CreateFinancialEntryAllocationsService } from './services/create-financial_entry_allocations.service';
import { UpdateFinancialEntryAllocationsService } from './services/update-financial_entry_allocations.service';
import { DeleteFinancialEntryAllocationsService } from './services/delete-financial_entry_allocations.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialEntryAllocations])],
  controllers: [FinancialEntryAllocationsController],
  providers: [
    FindFinancialEntryAllocationsService,
    CreateFinancialEntryAllocationsService,
    UpdateFinancialEntryAllocationsService,
    DeleteFinancialEntryAllocationsService,
  ],
  exports: [FindFinancialEntryAllocationsService],
})
export class FinancialEntryAllocationsModule {}
