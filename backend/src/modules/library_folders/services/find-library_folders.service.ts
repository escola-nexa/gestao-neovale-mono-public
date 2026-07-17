import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryFolders } from '../entities/library_folders.entity';

@Injectable()
export class FindLibraryFoldersService {
  constructor(
    @InjectRepository(LibraryFolders)
    private readonly repository: Repository<LibraryFolders>,
  ) {}

  async findAll(organizationId: string): Promise<LibraryFolders[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<LibraryFolders | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
