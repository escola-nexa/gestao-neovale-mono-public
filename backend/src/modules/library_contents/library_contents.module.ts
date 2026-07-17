import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryContents } from './entities/library_contents.entity';
import { LibraryContentsController } from './controllers/library_contents.controller';
import { FindLibraryContentsService } from './services/find-library_contents.service';
import { CreateLibraryContentsService } from './services/create-library_contents.service';
import { UpdateLibraryContentsService } from './services/update-library_contents.service';
import { DeleteLibraryContentsService } from './services/delete-library_contents.service';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryContents])],
  controllers: [LibraryContentsController],
  providers: [
    FindLibraryContentsService,
    CreateLibraryContentsService,
    UpdateLibraryContentsService,
    DeleteLibraryContentsService,
  ],
  exports: [FindLibraryContentsService],
})
export class LibraryContentsModule {}
