import { PartialType } from '@nestjs/mapped-types';
import { CreateQuarterlyKeywordsDto } from './create-quarterly_keywords.dto';

export class UpdateQuarterlyKeywordsDto extends PartialType(CreateQuarterlyKeywordsDto) {}
