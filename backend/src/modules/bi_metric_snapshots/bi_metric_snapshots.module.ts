import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiMetricSnapshots } from './entities/bi_metric_snapshots.entity';
import { BiMetricSnapshotsController } from './controllers/bi_metric_snapshots.controller';
import { FindBiMetricSnapshotsService } from './services/find-bi_metric_snapshots.service';
import { CreateBiMetricSnapshotsService } from './services/create-bi_metric_snapshots.service';
import { UpdateBiMetricSnapshotsService } from './services/update-bi_metric_snapshots.service';
import { DeleteBiMetricSnapshotsService } from './services/delete-bi_metric_snapshots.service';

@Module({
  imports: [TypeOrmModule.forFeature([BiMetricSnapshots])],
  controllers: [BiMetricSnapshotsController],
  providers: [
    FindBiMetricSnapshotsService,
    CreateBiMetricSnapshotsService,
    UpdateBiMetricSnapshotsService,
    DeleteBiMetricSnapshotsService,
  ],
  exports: [FindBiMetricSnapshotsService],
})
export class BiMetricSnapshotsModule {}
