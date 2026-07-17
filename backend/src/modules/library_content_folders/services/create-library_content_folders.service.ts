import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryContentFolders } from '../entities/library_content_folders.entity';
import { CreateLibraryContentFoldersDto } from '../dto/create-library_content_folders.dto';

@Injectable()
export class CreateLibraryContentFoldersService {
  constructor(
    @InjectRepository(LibraryContentFolders)
    private readonly repository: Repository<LibraryContentFolders>,
  ) {}

  async execute(dto: CreateLibraryContentFoldersDto, organizationId: string): Promise<LibraryContentFolders> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
