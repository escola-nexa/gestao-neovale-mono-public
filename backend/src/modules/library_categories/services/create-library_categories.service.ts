import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryCategories } from '../entities/library_categories.entity';
import { CreateLibraryCategoriesDto } from '../dto/create-library_categories.dto';

@Injectable()
export class CreateLibraryCategoriesService {
  constructor(
    @InjectRepository(LibraryCategories)
    private readonly repository: Repository<LibraryCategories>,
  ) {}

  async execute(dto: CreateLibraryCategoriesDto, organizationId: string): Promise<LibraryCategories> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
