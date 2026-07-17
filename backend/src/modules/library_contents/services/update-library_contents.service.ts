import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryContents } from '../entities/library_contents.entity';
import { UpdateLibraryContentsDto } from '../dto/update-library_contents.dto';

@Injectable()
export class UpdateLibraryContentsService {
  constructor(
    @InjectRepository(LibraryContents)
    private readonly repository: Repository<LibraryContents>,
  ) {}

  async execute(id: string, dto: UpdateLibraryContentsDto, organizationId: string): Promise<LibraryContents> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
