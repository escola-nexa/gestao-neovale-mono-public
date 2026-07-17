import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFormativeTracksDto } from '../dto/create-formative_tracks.dto';
import { UpdateFormativeTracksDto } from '../dto/update-formative_tracks.dto';
import { FindFormativeTracksService } from '../services/find-formative_tracks.service';
import { CreateFormativeTracksService } from '../services/create-formative_tracks.service';
import { UpdateFormativeTracksService } from '../services/update-formative_tracks.service';
import { DeleteFormativeTracksService } from '../services/delete-formative_tracks.service';

@Controller('formative-tracks')
@UseGuards(JwtAuthGuard)
export class FormativeTracksController {
  constructor(
    private readonly findService: FindFormativeTracksService,
    private readonly createService: CreateFormativeTracksService,
    private readonly updateService: UpdateFormativeTracksService,
    private readonly deleteService: DeleteFormativeTracksService,
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
  async create(@Body() dto: CreateFormativeTracksDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFormativeTracksDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
