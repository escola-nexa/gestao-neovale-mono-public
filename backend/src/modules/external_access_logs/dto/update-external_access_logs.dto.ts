import { PartialType } from '@nestjs/mapped-types';
import { CreateExternalAccessLogsDto } from './create-external_access_logs.dto';

export class UpdateExternalAccessLogsDto extends PartialType(CreateExternalAccessLogsDto) {}
