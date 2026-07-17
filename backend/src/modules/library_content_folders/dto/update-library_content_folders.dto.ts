import { PartialType } from '@nestjs/mapped-types';
import { CreateLibraryContentFoldersDto } from './create-library_content_folders.dto';

export class UpdateLibraryContentFoldersDto extends PartialType(CreateLibraryContentFoldersDto) {}
