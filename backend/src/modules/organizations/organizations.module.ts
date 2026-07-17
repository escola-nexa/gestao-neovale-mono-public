import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organizations } from './entities/organizations.entity';
import { OrganizationsController } from './controllers/organizations.controller';
import { FindOrganizationsService } from './services/find-organizations.service';
import { CreateOrganizationsService } from './services/create-organizations.service';
import { UpdateOrganizationsService } from './services/update-organizations.service';
import { DeleteOrganizationsService } from './services/delete-organizations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Organizations])],
  controllers: [OrganizationsController],
  providers: [
    FindOrganizationsService,
    CreateOrganizationsService,
    UpdateOrganizationsService,
    DeleteOrganizationsService,
  ],
  exports: [FindOrganizationsService],
})
export class OrganizationsModule {}
