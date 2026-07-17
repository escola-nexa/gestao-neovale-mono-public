import { PartialType } from '@nestjs/mapped-types';
import { CreateLibraryFoldersDto } from './create-library_folders.dto';

export class UpdateLibraryFoldersDto extends PartialType(CreateLibraryFoldersDto) {}
