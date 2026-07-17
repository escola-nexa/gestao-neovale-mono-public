import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateOrganizationsDto } from '../dto/create-organizations.dto';
import { UpdateOrganizationsDto } from '../dto/update-organizations.dto';
import { FindOrganizationsService } from '../services/find-organizations.service';
import { CreateOrganizationsService } from '../services/create-organizations.service';
import { UpdateOrganizationsService } from '../services/update-organizations.service';
import { DeleteOrganizationsService } from '../services/delete-organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly findService: FindOrganizationsService,
    private readonly createService: CreateOrganizationsService,
    private readonly updateService: UpdateOrganizationsService,
    private readonly deleteService: DeleteOrganizationsService,
  ) {}

  @Get()
  async findAll() {
    return this.findService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.findService.findOne(id);
  }

  @Get(':id/branding')
  async getBranding(@Param('id') id: string) {
    const org = await this.findService.findOne(id);
    return org || {};
  }

  @Get(':id/configuration-status')
  async getConfigurationStatus(@Param('id') id: string) {
    const org = await this.findService.findOne(id);
    return { configured: true, organization: org };
  }

  @Post()
  async create(@Body() dto: CreateOrganizationsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
