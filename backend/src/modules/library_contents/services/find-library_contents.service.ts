import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryContents } from '../entities/library_contents.entity';

@Injectable()
export class FindLibraryContentsService {
  constructor(
    @InjectRepository(LibraryContents)
    private readonly repository: Repository<LibraryContents>,
  ) {}

  async findAll(organizationId: string): Promise<LibraryContents[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<LibraryContents | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
