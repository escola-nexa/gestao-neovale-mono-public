import { PartialType } from '@nestjs/mapped-types';
import { CreateSubstitutionPaymentsDto } from './create-substitution_payments.dto';

export class UpdateSubstitutionPaymentsDto extends PartialType(CreateSubstitutionPaymentsDto) {}
