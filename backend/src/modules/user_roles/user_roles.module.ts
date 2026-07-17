import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRoles } from './entities/user_roles.entity';
import { UserRolesController } from './controllers/user_roles.controller';
import { FindUserRolesService } from './services/find-user_roles.service';
import { CreateUserRolesService } from './services/create-user_roles.service';
import { UpdateUserRolesService } from './services/update-user_roles.service';
import { DeleteUserRolesService } from './services/delete-user_roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRoles])],
  controllers: [UserRolesController],
  providers: [
    FindUserRolesService,
    CreateUserRolesService,
    UpdateUserRolesService,
    DeleteUserRolesService,
  ],
  exports: [FindUserRolesService],
})
export class UserRolesModule {}
