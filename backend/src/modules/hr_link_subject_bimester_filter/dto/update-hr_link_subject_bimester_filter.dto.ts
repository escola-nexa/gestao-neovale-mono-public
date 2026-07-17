import { PartialType } from '@nestjs/mapped-types';
import { CreateHrLinkSubjectBimesterFilterDto } from './create-hr_link_subject_bimester_filter.dto';

export class UpdateHrLinkSubjectBimesterFilterDto extends PartialType(CreateHrLinkSubjectBimesterFilterDto) {}
