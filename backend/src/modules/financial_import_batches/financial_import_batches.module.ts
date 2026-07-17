import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialImportBatches } from './entities/financial_import_batches.entity';
import { FinancialImportBatchesController } from './controllers/financial_import_batches.controller';
import { FindFinancialImportBatchesService } from './services/find-financial_import_batches.service';
import { CreateFinancialImportBatchesService } from './services/create-financial_import_batches.service';
import { UpdateFinancialImportBatchesService } from './services/update-financial_import_batches.service';
import { DeleteFinancialImportBatchesService } from './services/delete-financial_import_batches.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialImportBatches])],
  controllers: [FinancialImportBatchesController],
  providers: [
    FindFinancialImportBatchesService,
    CreateFinancialImportBatchesService,
    UpdateFinancialImportBatchesService,
    DeleteFinancialImportBatchesService,
  ],
  exports: [FindFinancialImportBatchesService],
})
export class FinancialImportBatchesModule {}
