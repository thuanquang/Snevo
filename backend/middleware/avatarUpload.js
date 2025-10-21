// backend/middleware/avatarUpload.js

// 📤 Avatar Upload Middleware with Supabase Storage

import { Readable } from 'stream';
import busboy from 'busboy';
import mimeTypes from 'mime-types';
import sharp from 'sharp';
import createSupabaseConfig from '../../config/supabase.js';
import { ValidationError } from '../utils/ErrorClasses.js';

class AvatarUploadMiddleware {
  constructor() {
    this.config = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
      storageBucket: 'avatars',
      imageQuality: 90,
      maxWidth: 512,
      maxHeight: 512
    };
  }

  /**
   * ⭐ Buffer entire request stream first
   */
  async bufferRequestStream(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  /**
   * ⭐ Parse multipart form data from buffer
   */
  async parseMultipartData(buffer, headers) {
    return new Promise((resolve, reject) => {
      const bb = busboy({ headers });
      const files = [];
      const fields = {};

      bb.on('file', (fieldname, file, info) => {
        const chunks = [];
        file.on('data', chunk => chunks.push(chunk));
        file.on('end', () => {
          files.push({
            fieldname,
            filename: info.filename,
            mimeType: info.mimeType,
            buffer: Buffer.concat(chunks)
          });
        });
      });

      bb.on('field', (fieldname, value) => {
        fields[fieldname] = value;
      });

      bb.on('error', reject);
      bb.on('close', () => resolve({ files, fields }));

      bb.write(buffer);
      bb.end();
    });
  }

  /**
   * ⭐ Validate file
   */
  validateFile(file) {
    if (!file.buffer || file.buffer.length === 0) {
      throw new ValidationError('File is empty');
    }

    if (file.buffer.length > this.config.maxFileSize) {
      throw new ValidationError(`File size exceeds ${this.config.maxFileSize / (1024 * 1024)}MB limit`);
    }

    if (!this.config.allowedMimeTypes.includes(file.mimeType)) {
      throw new ValidationError('Invalid file type. Allowed: JPG, PNG, WEBP');
    }

    const ext = '.' + file.filename.split('.').pop().toLowerCase();
    if (!this.config.allowedExtensions.includes(ext)) {
      throw new ValidationError('Invalid file extension');
    }
  }

  /**
   * ⭐ Optimize image for avatar
   */
  async optimizeImage(buffer) {
    try {
      console.log('🎨 Optimizing avatar image...');
      
      const optimized = await sharp(buffer)
        .resize(this.config.maxWidth, this.config.maxHeight, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: this.config.imageQuality })
        .toBuffer();

      console.log(`✅ Image optimized: ${buffer.length} → ${optimized.length} bytes`);
      return optimized;
    } catch (error) {
      throw new ValidationError('Failed to process image: ' + error.message);
    }
  }

  /**
   * ⭐ Delete old avatar file from Supabase
   */
  async deleteOldAvatar(userId, oldAvatarUrl) {
    try {
      if (!oldAvatarUrl) return; // No old avatar to delete

      console.log('🗑️ Attempting to delete old avatar:', oldAvatarUrl);

      // Extract path from URL
      const urlPath = new URL(oldAvatarUrl).pathname;
      const filePath = urlPath.split('/storage/v1/object/public/avatars/')[1];
      
      if (!filePath) {
        console.log('⏭️ Could not extract file path from URL');
        return;
      }

      // Only delete if it belongs to this user
      if (!filePath.startsWith(`${userId}/`)) {
        console.log('⚠️ Avatar URL does not match user folder, skipping delete');
        return;
      }

      const { error } = await createSupabaseConfig().getAdminClient().storage
        .from(this.config.storageBucket)
        .remove([filePath]);

      if (error) {
        console.warn('⚠️ Failed to delete old avatar:', error.message);
        // Don't throw - this shouldn't block the new upload
      } else {
        console.log('✅ Old avatar deleted successfully');
      }
    } catch (error) {
      console.warn('⚠️ Error deleting old avatar:', error.message);
      // Don't throw - this shouldn't block the new upload
    }
  }

  /**
   * ⭐ Upload file to Supabase Storage
   */
  async uploadToSupabase(file, userId) {
    try {
      console.log('📤 Uploading avatar to Supabase:', file.filename);

      // Validate file first
      this.validateFile(file);

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.filename.split('.').pop();
      const fileName = `${timestamp}_${randomStr}.${ext}`;
      const filePath = `${userId}/${fileName}`;

      // Optimize image before upload
      const optimizedBuffer = await this.optimizeImage(file.buffer);

      // Upload to Supabase
      const { data, error } = await createSupabaseConfig().getAdminClient().storage
        .from(this.config.storageBucket)
        .upload(filePath, optimizedBuffer, {
          contentType: file.mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = createSupabaseConfig().getAdminClient().storage
        .from(this.config.storageBucket)
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      console.log('✅ Avatar upload successful:', publicUrl);
      return publicUrl;

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * ⭐ Main middleware function for avatar uploads
   */
  async handleUpload(req, res, next) {
    try {
      console.log('🔄 Starting avatar upload middleware...');
      
      const contentType = req.headers['content-type'] || '';
      
      if (!contentType.includes('multipart/form-data')) {
        console.log('⏭️ Not multipart, skipping avatar upload middleware');
        return next?.();
      }

      // Get user ID from authenticated request
      if (!req.user || !req.user.id) {
        throw new ValidationError('User not authenticated');
      }

      const userId = req.user.id;
      console.log('👤 Processing avatar for user:', userId);

      // Buffer stream FIRST before parsing
      console.log('📦 Buffering request stream...');
      const buffer = await this.bufferRequestStream(req);
      console.log(`✅ Stream buffered: ${buffer.length} bytes`);

      // Parse from buffer instead of stream
      const { files, fields } = await this.parseMultipartData(buffer, req.headers);
      
      console.log(`📦 Parsed ${files.length} file(s), ${Object.keys(fields).length} field(s)`);

      // Attach fields to req.body
      req.body = fields;

      // Process uploaded file
      if (files.length > 0) {
        const file = files[0]; // Take first file
        
        // Delete old avatar if exists
        if (req.body.old_avatar_url) {
          await this.deleteOldAvatar(userId, req.body.old_avatar_url);
          delete req.body.old_avatar_url; // Remove from body
        }
        
        // Upload new avatar to Supabase
        const avatarUrl = await this.uploadToSupabase(file, userId);
        
        // Attach image URL to req.body
        req.body.avatar_url = avatarUrl;
        
        console.log('✅ Avatar uploaded successfully:', avatarUrl);
      }

      next?.();

    } catch (error) {
      console.error('❌ Avatar upload middleware error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message || 'Avatar upload failed'
      }));
    }
  }
}

export default new AvatarUploadMiddleware();

