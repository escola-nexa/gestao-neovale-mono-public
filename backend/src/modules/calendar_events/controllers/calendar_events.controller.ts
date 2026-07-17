import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateCalendarEventsDto } from '../dto/create-calendar_events.dto';
import { UpdateCalendarEventsDto } from '../dto/update-calendar_events.dto';
import { FindCalendarEventsService } from '../services/find-calendar_events.service';
import { CreateCalendarEventsService } from '../services/create-calendar_events.service';
import { UpdateCalendarEventsService } from '../services/update-calendar_events.service';
import { DeleteCalendarEventsService } from '../services/delete-calendar_events.service';

@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarEventsController {
  constructor(
    private readonly findService: FindCalendarEventsService,
    private readonly createService: CreateCalendarEventsService,
    private readonly updateService: UpdateCalendarEventsService,
    private readonly deleteService: DeleteCalendarEventsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('calendarId') calendarId?: string) {
    return this.findService.findAll(user.organizationId || user.id, calendarId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateCalendarEventsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCalendarEventsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
