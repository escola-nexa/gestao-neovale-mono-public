import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryContents } from '../entities/library_contents.entity';
import { CreateLibraryContentsDto } from '../dto/create-library_contents.dto';

@Injectable()
export class CreateLibraryContentsService {
  constructor(
    @InjectRepository(LibraryContents)
    private readonly repository: Repository<LibraryContents>,
  ) {}

  async execute(dto: CreateLibraryContentsDto, organizationId: string): Promise<LibraryContents> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
