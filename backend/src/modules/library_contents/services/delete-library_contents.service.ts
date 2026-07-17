import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryContents } from '../entities/library_contents.entity';

@Injectable()
export class DeleteLibraryContentsService {
  constructor(
    @InjectRepository(LibraryContents)
    private readonly repository: Repository<LibraryContents>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
