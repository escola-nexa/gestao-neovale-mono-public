import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryContentFolders } from '../entities/library_content_folders.entity';

@Injectable()
export class DeleteLibraryContentFoldersService {
  constructor(
    @InjectRepository(LibraryContentFolders)
    private readonly repository: Repository<LibraryContentFolders>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
