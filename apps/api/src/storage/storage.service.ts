import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly supabase: SupabaseClient;
  private readonly bucket = 'service-photos';

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');

    const supabaseServiceRoleKey = this.configService.getOrThrow<string>(
      'SUPABASE_SECRET_KEY',
    );

    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  //-------------------------------------------------------------//
  async save(file: Express.Multer.File, directory: string): Promise<string> {
    const extension = path.extname(file.originalname);

    const fileName = `${randomUUID()}${extension}`;

    const storageKey = `${directory}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(storageKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException('Failed to upload file');
    }

    return storageKey;
  }

  //-------------------------------------------------------------//
  async delete(storageKey: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([storageKey]);

    if (error) {
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  //-------------------------------------------------------------//
  async getUrl(storageKey: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, 60 * 60);

    if (error) {
      throw new InternalServerErrorException('Failed to generate file URL');
    }

    return data.signedUrl;
  }
}
