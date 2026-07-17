import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrAllocationItems } from './entities/hr_allocation_items.entity';
import { HrAllocationItemsController } from './controllers/hr_allocation_items.controller';
import { FindHrAllocationItemsService } from './services/find-hr_allocation_items.service';
import { CreateHrAllocationItemsService } from './services/create-hr_allocation_items.service';
import { UpdateHrAllocationItemsService } from './services/update-hr_allocation_items.service';
import { DeleteHrAllocationItemsService } from './services/delete-hr_allocation_items.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrAllocationItems])],
  controllers: [HrAllocationItemsController],
  providers: [
    FindHrAllocationItemsService,
    CreateHrAllocationItemsService,
    UpdateHrAllocationItemsService,
    DeleteHrAllocationItemsService,
  ],
  exports: [FindHrAllocationItemsService],
})
export class HrAllocationItemsModule {}
