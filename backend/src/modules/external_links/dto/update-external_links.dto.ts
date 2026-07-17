import { PartialType } from '@nestjs/mapped-types';
import { CreateExternalLinksDto } from './create-external_links.dto';

export class UpdateExternalLinksDto extends PartialType(CreateExternalLinksDto) {}
