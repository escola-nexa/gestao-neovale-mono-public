import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryContentFolders } from '../entities/library_content_folders.entity';
import { UpdateLibraryContentFoldersDto } from '../dto/update-library_content_folders.dto';

@Injectable()
export class UpdateLibraryContentFoldersService {
  constructor(
    @InjectRepository(LibraryContentFolders)
    private readonly repository: Repository<LibraryContentFolders>,
  ) {}

  async execute(id: string, dto: UpdateLibraryContentFoldersDto, organizationId: string): Promise<LibraryContentFolders> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
