import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassGroups } from './entities/class_groups.entity';
import { ClassGroupsController } from './controllers/class_groups.controller';
import { FindClassGroupsService } from './services/find-class_groups.service';
import { CreateClassGroupsService } from './services/create-class_groups.service';
import { UpdateClassGroupsService } from './services/update-class_groups.service';
import { DeleteClassGroupsService } from './services/delete-class_groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClassGroups])],
  controllers: [ClassGroupsController],
  providers: [
    FindClassGroupsService,
    CreateClassGroupsService,
    UpdateClassGroupsService,
    DeleteClassGroupsService,
  ],
  exports: [FindClassGroupsService],
})
export class ClassGroupsModule {}
