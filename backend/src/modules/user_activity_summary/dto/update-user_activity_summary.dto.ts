import { PartialType } from '@nestjs/mapped-types';
import { CreateUserActivitySummaryDto } from './create-user_activity_summary.dto';

export class UpdateUserActivitySummaryDto extends PartialType(CreateUserActivitySummaryDto) {}
