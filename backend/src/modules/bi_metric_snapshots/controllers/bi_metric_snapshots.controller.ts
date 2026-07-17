import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateBiMetricSnapshotsDto } from '../dto/create-bi_metric_snapshots.dto';
import { UpdateBiMetricSnapshotsDto } from '../dto/update-bi_metric_snapshots.dto';
import { FindBiMetricSnapshotsService } from '../services/find-bi_metric_snapshots.service';
import { CreateBiMetricSnapshotsService } from '../services/create-bi_metric_snapshots.service';
import { UpdateBiMetricSnapshotsService } from '../services/update-bi_metric_snapshots.service';
import { DeleteBiMetricSnapshotsService } from '../services/delete-bi_metric_snapshots.service';

@Controller('bi-metric-snapshots')
@UseGuards(JwtAuthGuard)
export class BiMetricSnapshotsController {
  constructor(
    private readonly findService: FindBiMetricSnapshotsService,
    private readonly createService: CreateBiMetricSnapshotsService,
    private readonly updateService: UpdateBiMetricSnapshotsService,
    private readonly deleteService: DeleteBiMetricSnapshotsService,
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
  async create(@Body() dto: CreateBiMetricSnapshotsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBiMetricSnapshotsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
