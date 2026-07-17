import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserActivitySummary } from './entities/user_activity_summary.entity';
import { UserActivitySummaryController } from './controllers/user_activity_summary.controller';
import { FindUserActivitySummaryService } from './services/find-user_activity_summary.service';
import { CreateUserActivitySummaryService } from './services/create-user_activity_summary.service';
import { UpdateUserActivitySummaryService } from './services/update-user_activity_summary.service';
import { DeleteUserActivitySummaryService } from './services/delete-user_activity_summary.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserActivitySummary])],
  controllers: [UserActivitySummaryController],
  providers: [
    FindUserActivitySummaryService,
    CreateUserActivitySummaryService,
    UpdateUserActivitySummaryService,
    DeleteUserActivitySummaryService,
  ],
  exports: [FindUserActivitySummaryService],
})
export class UserActivitySummaryModule {}
