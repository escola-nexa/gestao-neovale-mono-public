import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateUserActivitySummaryDto } from '../dto/create-user_activity_summary.dto';
import { UpdateUserActivitySummaryDto } from '../dto/update-user_activity_summary.dto';
import { FindUserActivitySummaryService } from '../services/find-user_activity_summary.service';
import { CreateUserActivitySummaryService } from '../services/create-user_activity_summary.service';
import { UpdateUserActivitySummaryService } from '../services/update-user_activity_summary.service';
import { DeleteUserActivitySummaryService } from '../services/delete-user_activity_summary.service';

@Controller('user-activity-summary')
@UseGuards(JwtAuthGuard)
export class UserActivitySummaryController {
  constructor(
    private readonly findService: FindUserActivitySummaryService,
    private readonly createService: CreateUserActivitySummaryService,
    private readonly updateService: UpdateUserActivitySummaryService,
    private readonly deleteService: DeleteUserActivitySummaryService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateUserActivitySummaryDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserActivitySummaryDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
