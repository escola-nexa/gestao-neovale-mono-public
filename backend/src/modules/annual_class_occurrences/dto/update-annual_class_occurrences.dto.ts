import { PartialType } from '@nestjs/mapped-types';
import { CreateAnnualClassOccurrencesDto } from './create-annual_class_occurrences.dto';

export class UpdateAnnualClassOccurrencesDto extends PartialType(CreateAnnualClassOccurrencesDto) {}
