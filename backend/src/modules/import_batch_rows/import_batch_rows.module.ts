import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportBatchRows } from './entities/import_batch_rows.entity';
import { ImportBatchRowsController } from './controllers/import_batch_rows.controller';
import { FindImportBatchRowsService } from './services/find-import_batch_rows.service';
import { CreateImportBatchRowsService } from './services/create-import_batch_rows.service';
import { UpdateImportBatchRowsService } from './services/update-import_batch_rows.service';
import { DeleteImportBatchRowsService } from './services/delete-import_batch_rows.service';

@Module({
  imports: [TypeOrmModule.forFeature([ImportBatchRows])],
  controllers: [ImportBatchRowsController],
  providers: [
    FindImportBatchRowsService,
    CreateImportBatchRowsService,
    UpdateImportBatchRowsService,
    DeleteImportBatchRowsService,
  ],
  exports: [FindImportBatchRowsService],
})
export class ImportBatchRowsModule {}
