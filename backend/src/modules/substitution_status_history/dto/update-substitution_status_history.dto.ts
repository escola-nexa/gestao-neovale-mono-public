import { PartialType } from '@nestjs/mapped-types';
import { CreateSubstitutionStatusHistoryDto } from './create-substitution_status_history.dto';

export class UpdateSubstitutionStatusHistoryDto extends PartialType(CreateSubstitutionStatusHistoryDto) {}
