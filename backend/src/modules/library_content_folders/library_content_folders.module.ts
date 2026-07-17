import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryContentFolders } from './entities/library_content_folders.entity';
import { LibraryContentFoldersController } from './controllers/library_content_folders.controller';
import { FindLibraryContentFoldersService } from './services/find-library_content_folders.service';
import { CreateLibraryContentFoldersService } from './services/create-library_content_folders.service';
import { UpdateLibraryContentFoldersService } from './services/update-library_content_folders.service';
import { DeleteLibraryContentFoldersService } from './services/delete-library_content_folders.service';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryContentFolders])],
  controllers: [LibraryContentFoldersController],
  providers: [
    FindLibraryContentFoldersService,
    CreateLibraryContentFoldersService,
    UpdateLibraryContentFoldersService,
    DeleteLibraryContentFoldersService,
  ],
  exports: [FindLibraryContentFoldersService],
})
export class LibraryContentFoldersModule {}
