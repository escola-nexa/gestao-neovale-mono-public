import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryCategories } from '../entities/library_categories.entity';

@Injectable()
export class FindLibraryCategoriesService {
  constructor(
    @InjectRepository(LibraryCategories)
    private readonly repository: Repository<LibraryCategories>,
  ) {}

  async findAll(organizationId: string): Promise<LibraryCategories[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<LibraryCategories | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
