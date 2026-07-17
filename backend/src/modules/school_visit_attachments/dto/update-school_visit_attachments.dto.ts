import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolVisitAttachmentsDto } from './create-school_visit_attachments.dto';

export class UpdateSchoolVisitAttachmentsDto extends PartialType(CreateSchoolVisitAttachmentsDto) {}
