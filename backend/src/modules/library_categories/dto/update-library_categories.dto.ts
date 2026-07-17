import { PartialType } from '@nestjs/mapped-types';
import { CreateLibraryCategoriesDto } from './create-library_categories.dto';

export class UpdateLibraryCategoriesDto extends PartialType(CreateLibraryCategoriesDto) {}
