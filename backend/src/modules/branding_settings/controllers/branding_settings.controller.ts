import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateBrandingSettingsDto } from '../dto/create-branding_settings.dto';
import { UpdateBrandingSettingsDto } from '../dto/update-branding_settings.dto';
import { FindBrandingSettingsService } from '../services/find-branding_settings.service';
import { CreateBrandingSettingsService } from '../services/create-branding_settings.service';
import { UpdateBrandingSettingsService } from '../services/update-branding_settings.service';
import { DeleteBrandingSettingsService } from '../services/delete-branding_settings.service';

@Controller('branding-settings')
@UseGuards(JwtAuthGuard)
export class BrandingSettingsController {
  constructor(
    private readonly findService: FindBrandingSettingsService,
    private readonly createService: CreateBrandingSettingsService,
    private readonly updateService: UpdateBrandingSettingsService,
    private readonly deleteService: DeleteBrandingSettingsService,
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
  async create(@Body() dto: CreateBrandingSettingsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandingSettingsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
