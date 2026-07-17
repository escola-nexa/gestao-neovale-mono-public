import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryFolders } from '../entities/library_folders.entity';
import { UpdateLibraryFoldersDto } from '../dto/update-library_folders.dto';

@Injectable()
export class UpdateLibraryFoldersService {
  constructor(
    @InjectRepository(LibraryFolders)
    private readonly repository: Repository<LibraryFolders>,
  ) {}

  async execute(id: string, dto: UpdateLibraryFoldersDto, organizationId: string): Promise<LibraryFolders> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
