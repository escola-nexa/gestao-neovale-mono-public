import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportBatches } from './entities/import_batches.entity';
import { ImportBatchesController } from './controllers/import_batches.controller';
import { FindImportBatchesService } from './services/find-import_batches.service';
import { CreateImportBatchesService } from './services/create-import_batches.service';
import { UpdateImportBatchesService } from './services/update-import_batches.service';
import { DeleteImportBatchesService } from './services/delete-import_batches.service';

@Module({
  imports: [TypeOrmModule.forFeature([ImportBatches])],
  controllers: [ImportBatchesController],
  providers: [
    FindImportBatchesService,
    CreateImportBatchesService,
    UpdateImportBatchesService,
    DeleteImportBatchesService,
  ],
  exports: [FindImportBatchesService],
})
export class ImportBatchesModule {}
