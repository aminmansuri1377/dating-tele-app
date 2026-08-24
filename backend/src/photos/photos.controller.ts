import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PhotosService } from './photos.service';
import { JwtPayload } from '../auth/jwt.strategy';

class RequestUploadDto {
  @IsString()
  contentType: string;
}

class ConfirmUploadDto {
  @IsString()
  storageKey: string;

  @IsString()
  publicUrl: string;
}

@UseGuards(JwtAuthGuard)
@Controller('photos')
export class PhotosController {
  constructor(private photosService: PhotosService) {}

  @Post('upload-url')
  createUploadUrl(@CurrentUser() user: JwtPayload, @Body() dto: RequestUploadDto) {
    return this.photosService.createUploadUrl(user.sub, dto.contentType);
  }

  @Post('confirm')
  confirmUpload(@CurrentUser() user: JwtPayload, @Body() dto: ConfirmUploadDto) {
    return this.photosService.confirmUpload(user.sub, dto.storageKey, dto.publicUrl);
  }

  @Delete(':id')
  deletePhoto(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.photosService.deletePhoto(user.sub, id);
  }
}
