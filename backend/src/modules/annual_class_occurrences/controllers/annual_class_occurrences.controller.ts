import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateAnnualClassOccurrencesDto } from '../dto/create-annual_class_occurrences.dto';
import { UpdateAnnualClassOccurrencesDto } from '../dto/update-annual_class_occurrences.dto';
import { FindAnnualClassOccurrencesService } from '../services/find-annual_class_occurrences.service';
import { CreateAnnualClassOccurrencesService } from '../services/create-annual_class_occurrences.service';
import { UpdateAnnualClassOccurrencesService } from '../services/update-annual_class_occurrences.service';
import { DeleteAnnualClassOccurrencesService } from '../services/delete-annual_class_occurrences.service';

@Controller('annual-class-occurrences')
@UseGuards(JwtAuthGuard)
export class AnnualClassOccurrencesController {
  constructor(
    private readonly findService: FindAnnualClassOccurrencesService,
    private readonly createService: CreateAnnualClassOccurrencesService,
    private readonly updateService: UpdateAnnualClassOccurrencesService,
    private readonly deleteService: DeleteAnnualClassOccurrencesService,
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
  async create(@Body() dto: CreateAnnualClassOccurrencesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAnnualClassOccurrencesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
