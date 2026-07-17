import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Professors } from './entities/professors.entity';
import { ProfessorsController } from './controllers/professors.controller';
import { FindProfessorsService } from './services/find-professors.service';
import { CreateProfessorsService } from './services/create-professors.service';
import { UpdateProfessorsService } from './services/update-professors.service';
import { DeleteProfessorsService } from './services/delete-professors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Professors])],
  controllers: [ProfessorsController],
  providers: [
    FindProfessorsService,
    CreateProfessorsService,
    UpdateProfessorsService,
    DeleteProfessorsService,
  ],
  exports: [FindProfessorsService],
})
export class ProfessorsModule {}
