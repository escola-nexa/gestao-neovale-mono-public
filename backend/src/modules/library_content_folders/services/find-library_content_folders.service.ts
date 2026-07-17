import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryContentFolders } from '../entities/library_content_folders.entity';

@Injectable()
export class FindLibraryContentFoldersService {
  constructor(
    @InjectRepository(LibraryContentFolders)
    private readonly repository: Repository<LibraryContentFolders>,
  ) {}

  async findAll(organizationId: string): Promise<LibraryContentFolders[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<LibraryContentFolders | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
