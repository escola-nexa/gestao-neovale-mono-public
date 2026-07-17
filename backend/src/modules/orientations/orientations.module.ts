import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orientations } from './entities/orientations.entity';
import { OrientationsController } from './controllers/orientations.controller';
import { FindOrientationsService } from './services/find-orientations.service';
import { CreateOrientationsService } from './services/create-orientations.service';
import { UpdateOrientationsService } from './services/update-orientations.service';
import { DeleteOrientationsService } from './services/delete-orientations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Orientations])],
  controllers: [OrientationsController],
  providers: [
    FindOrientationsService,
    CreateOrientationsService,
    UpdateOrientationsService,
    DeleteOrientationsService,
  ],
  exports: [FindOrientationsService],
})
export class OrientationsModule {}
