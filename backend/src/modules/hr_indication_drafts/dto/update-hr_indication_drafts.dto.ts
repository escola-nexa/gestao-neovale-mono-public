import { PartialType } from '@nestjs/mapped-types';
import { CreateHrIndicationDraftsDto } from './create-hr_indication_drafts.dto';

export class UpdateHrIndicationDraftsDto extends PartialType(CreateHrIndicationDraftsDto) {}
