import { PartialType } from '@nestjs/mapped-types';
import { CreateHrIndicationClassesDto } from './create-hr_indication_classes.dto';

export class UpdateHrIndicationClassesDto extends PartialType(CreateHrIndicationClassesDto) {}
