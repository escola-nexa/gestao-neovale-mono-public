import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryCategories } from './entities/library_categories.entity';
import { LibraryCategoriesController } from './controllers/library_categories.controller';
import { FindLibraryCategoriesService } from './services/find-library_categories.service';
import { CreateLibraryCategoriesService } from './services/create-library_categories.service';
import { UpdateLibraryCategoriesService } from './services/update-library_categories.service';
import { DeleteLibraryCategoriesService } from './services/delete-library_categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryCategories])],
  controllers: [LibraryCategoriesController],
  providers: [
    FindLibraryCategoriesService,
    CreateLibraryCategoriesService,
    UpdateLibraryCategoriesService,
    DeleteLibraryCategoriesService,
  ],
  exports: [FindLibraryCategoriesService],
})
export class LibraryCategoriesModule {}
