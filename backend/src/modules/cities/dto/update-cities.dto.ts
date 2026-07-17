import { PartialType } from '@nestjs/mapped-types';
import { CreateCitiesDto } from './create-cities.dto';

export class UpdateCitiesDto extends PartialType(CreateCitiesDto) {}
