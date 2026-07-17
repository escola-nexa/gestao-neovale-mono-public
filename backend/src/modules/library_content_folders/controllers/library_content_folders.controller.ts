import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateLibraryContentFoldersDto } from '../dto/create-library_content_folders.dto';
import { UpdateLibraryContentFoldersDto } from '../dto/update-library_content_folders.dto';
import { FindLibraryContentFoldersService } from '../services/find-library_content_folders.service';
import { CreateLibraryContentFoldersService } from '../services/create-library_content_folders.service';
import { UpdateLibraryContentFoldersService } from '../services/update-library_content_folders.service';
import { DeleteLibraryContentFoldersService } from '../services/delete-library_content_folders.service';

@Controller('library-content-folders')
@UseGuards(JwtAuthGuard)
export class LibraryContentFoldersController {
  constructor(
    private readonly findService: FindLibraryContentFoldersService,
    private readonly createService: CreateLibraryContentFoldersService,
    private readonly updateService: UpdateLibraryContentFoldersService,
    private readonly deleteService: DeleteLibraryContentFoldersService,
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
  async create(@Body() dto: CreateLibraryContentFoldersDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLibraryContentFoldersDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
