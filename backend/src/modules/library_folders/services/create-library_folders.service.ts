import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryFolders } from '../entities/library_folders.entity';
import { CreateLibraryFoldersDto } from '../dto/create-library_folders.dto';

@Injectable()
export class CreateLibraryFoldersService {
  constructor(
    @InjectRepository(LibraryFolders)
    private readonly repository: Repository<LibraryFolders>,
  ) {}

  async execute(dto: CreateLibraryFoldersDto, organizationId: string): Promise<LibraryFolders> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
