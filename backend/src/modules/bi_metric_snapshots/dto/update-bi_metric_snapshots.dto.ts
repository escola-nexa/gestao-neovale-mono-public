import { PartialType } from '@nestjs/mapped-types';
import { CreateBiMetricSnapshotsDto } from './create-bi_metric_snapshots.dto';

export class UpdateBiMetricSnapshotsDto extends PartialType(CreateBiMetricSnapshotsDto) {}
