import { PartialType } from '@nestjs/mapped-types';
import { CreateLibraryContentsDto } from './create-library_contents.dto';

export class UpdateLibraryContentsDto extends PartialType(CreateLibraryContentsDto) {}
