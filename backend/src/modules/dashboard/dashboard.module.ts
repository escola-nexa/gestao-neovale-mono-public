import { Module } from '@nestjs/common';
import { DashboardBiController } from './controllers/dashboard-bi.controller';
import { SidebarController } from './controllers/sidebar.controller';
import { DashboardService } from './services/dashboard.service';

@Module({
  controllers: [DashboardBiController, SidebarController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
