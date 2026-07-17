import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHelpTutorialsDto } from '../dto/create-help_tutorials.dto';
import { UpdateHelpTutorialsDto } from '../dto/update-help_tutorials.dto';
import { FindHelpTutorialsService } from '../services/find-help_tutorials.service';
import { CreateHelpTutorialsService } from '../services/create-help_tutorials.service';
import { UpdateHelpTutorialsService } from '../services/update-help_tutorials.service';
import { DeleteHelpTutorialsService } from '../services/delete-help_tutorials.service';

@Controller('help-tutorials')
@UseGuards(JwtAuthGuard)
export class HelpTutorialsController {
  constructor(
    private readonly findService: FindHelpTutorialsService,
    private readonly createService: CreateHelpTutorialsService,
    private readonly updateService: UpdateHelpTutorialsService,
    private readonly deleteService: DeleteHelpTutorialsService,
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
  async create(@Body() dto: CreateHelpTutorialsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHelpTutorialsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
