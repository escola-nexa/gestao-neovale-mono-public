import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryCategories } from '../entities/library_categories.entity';
import { UpdateLibraryCategoriesDto } from '../dto/update-library_categories.dto';

@Injectable()
export class UpdateLibraryCategoriesService {
  constructor(
    @InjectRepository(LibraryCategories)
    private readonly repository: Repository<LibraryCategories>,
  ) {}

  async execute(id: string, dto: UpdateLibraryCategoriesDto, organizationId: string): Promise<LibraryCategories> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
