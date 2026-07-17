import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryCategories } from '../entities/library_categories.entity';

@Injectable()
export class DeleteLibraryCategoriesService {
  constructor(
    @InjectRepository(LibraryCategories)
    private readonly repository: Repository<LibraryCategories>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
