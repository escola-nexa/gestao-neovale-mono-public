import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryFolders } from './entities/library_folders.entity';
import { LibraryFoldersController } from './controllers/library_folders.controller';
import { FindLibraryFoldersService } from './services/find-library_folders.service';
import { CreateLibraryFoldersService } from './services/create-library_folders.service';
import { UpdateLibraryFoldersService } from './services/update-library_folders.service';
import { DeleteLibraryFoldersService } from './services/delete-library_folders.service';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryFolders])],
  controllers: [LibraryFoldersController],
  providers: [
    FindLibraryFoldersService,
    CreateLibraryFoldersService,
    UpdateLibraryFoldersService,
    DeleteLibraryFoldersService,
  ],
  exports: [FindLibraryFoldersService],
})
export class LibraryFoldersModule {}
