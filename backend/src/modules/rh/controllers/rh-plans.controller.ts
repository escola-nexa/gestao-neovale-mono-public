import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { RhService } from '../services/rh.service';

@Controller('rh/plans')
@UseGuards(JwtAuthGuard)
export class RhPlansController {
  constructor(private readonly rhService: RhService) {}

  @Get()
  async getPlans(@Query('organization_id') orgId: string, @CurrentUser() user: any) {
    return this.rhService.getPlans(orgId || user.organizationId || user.id);
  }

  @Post()
  async createPlan(@Body() body: any) {
    return this.rhService.createPlan(body);
  }

  @Get(':id')
  async getPlanById(@Param('id') id: string) {
    return this.rhService.getPlanById(id);
  }

  @Delete(':id')
  async deletePlan(@Param('id') id: string) {
    return this.rhService.deletePlan(id);
  }

  @Get(':id/items')
  async getPlanItems(@Param('id') id: string) {
    return this.rhService.getPlanItems(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.rhService.updatePlanStatus(id, body.status, user.id);
  }

  @Post(':id/publish')
  async publishPlan(@Param('id') id: string) {
    return this.rhService.publishPlan(id);
  }

  @Patch('/../items/:itemId')
  async updateItem(@Param('itemId') itemId: string, @Body() body: any) {
    return this.rhService.updateItem(itemId, body);
  }
}
