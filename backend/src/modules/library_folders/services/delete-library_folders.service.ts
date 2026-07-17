import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryFolders } from '../entities/library_folders.entity';

@Injectable()
export class DeleteLibraryFoldersService {
  constructor(
    @InjectRepository(LibraryFolders)
    private readonly repository: Repository<LibraryFolders>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
