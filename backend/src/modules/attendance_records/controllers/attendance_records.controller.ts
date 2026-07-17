import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateAttendanceRecordsDto } from '../dto/create-attendance_records.dto';
import { UpdateAttendanceRecordsDto } from '../dto/update-attendance_records.dto';
import { FindAttendanceRecordsService } from '../services/find-attendance_records.service';
import { CreateAttendanceRecordsService } from '../services/create-attendance_records.service';
import { UpdateAttendanceRecordsService } from '../services/update-attendance_records.service';
import { DeleteAttendanceRecordsService } from '../services/delete-attendance_records.service';

@Controller('attendance-records')
@UseGuards(JwtAuthGuard)
export class AttendanceRecordsController {
  constructor(
    private readonly findService: FindAttendanceRecordsService,
    private readonly createService: CreateAttendanceRecordsService,
    private readonly updateService: UpdateAttendanceRecordsService,
    private readonly deleteService: DeleteAttendanceRecordsService,
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
  async create(@Body() dto: CreateAttendanceRecordsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAttendanceRecordsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
