// backend/middleware/upload.js

// 📤 File Upload Middleware with Supabase Storage

import { Readable } from 'stream';
import busboy from 'busboy';
import mimeTypes from 'mime-types';
import sharp from 'sharp';
import createSupabaseConfig from '../../config/supabase.js';
import { ValidationError } from '../utils/ErrorClasses.js';

// ✅ FIX: Use same pattern as Product.js
const supabaseConfig = createSupabaseConfig();

class UploadMiddleware {
  constructor(options = {}) {
    // ⭐ UPDATED: Accept configurable options
    const defaultOptions = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/avif'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'],
      storageBucket: 'product-images',
      storagePath: 'products', // 📌 NEW: configurable path prefix
      imageQuality: 90,
      maxWidth: 2048,
      maxHeight: 2048
    };

    // Merge options with defaults
    this.config = { ...defaultOptions, ...options };
    console.log('📦 UploadMiddleware initialized with config:', {
      bucket: this.config.storageBucket,
      path: this.config.storagePath,
      maxSize: this.config.maxFileSize
    });
  }

  /**
   * ⭐ Buffer entire request stream first
   */
  async bufferRequestStream(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      req.on('data', chunk => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      req.on('error', error => {
        reject(error);
      });
    });
  }

  /**
   * ⭐ Parse multipart/form-data from buffer
   */
  async parseMultipartData(buffer, headers) {
    return new Promise((resolve, reject) => {
      const bb = busboy({ headers });
      const files = [];
      const fields = {};

      bb.on('file', (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;
        console.log(`📎 Receiving file: ${filename} (${mimeType})`);

        const chunks = [];
        file.on('data', (chunk) => {
          chunks.push(chunk);
        });

        file.on('end', () => {
          const fileBuffer = Buffer.concat(chunks);
          files.push({
            fieldname,
            filename,
            encoding,
            mimeType,
            buffer: fileBuffer,
            size: fileBuffer.length
          });
        });
      });

      bb.on('field', (fieldname, value) => {
        console.log(`📝 Field: ${fieldname} = ${value}`);
        fields[fieldname] = value;
      });

      bb.on('finish', () => {
        console.log('✅ Busboy finished parsing');
        
        // ⭐ Convert field types BEFORE resolving
        const convertedFields = this.convertFieldTypes(fields);
        console.log('🔄 Converted fields:', convertedFields);
        
        resolve({ files, fields: convertedFields });
      });

      bb.on('error', (err) => {
        console.error('❌ Busboy error:', err);
        reject(err);
      });

      // ✅ Create readable stream from buffer
      const stream = Readable.from(buffer);
      stream.pipe(bb);
    });
  }

  /**
   * Validate file trước khi upload
   */
  validateFile(file) {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      throw new ValidationError(
        `File too large. Maximum size is ${this.config.maxFileSize / 1024 / 1024}MB`
      );
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(file.mimeType)) {
      throw new ValidationError(
        `Invalid file type. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`
      );
    }

    // Check extension
    const ext = mimeTypes.extension(file.mimeType);
    if (!this.config.allowedExtensions.includes(`.${ext}`)) {
      throw new ValidationError(
        `Invalid file extension. Allowed: ${this.config.allowedExtensions.join(', ')}`
      );
    }

    return true;
  }

  /**
   * Optimize image bằng sharp
   */
  async optimizeImage(buffer) {
    try {
      return await sharp(buffer)
        .resize(this.config.maxWidth, this.config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: this.config.imageQuality })
        .toBuffer();
    } catch (error) {
      throw new ValidationError('Failed to process image: ' + error.message);
    }
  }

  /**
   * ⭐ Upload file lên Supabase Storage
   */
  async uploadToSupabase(file) {
    try {
      console.log('📤 Uploading to Supabase:', file.filename);

      // Validate file first
      this.validateFile(file);

      // Generate unique filename
      const filePath = this.generateStoragePath(file.filename);

      // Optimize image before upload
      const optimizedBuffer = await this.optimizeImage(file.buffer);

      // ✅ Use getAdminClient() - same pattern as Product.js!
      const { data, error } = await supabaseConfig.getAdminClient().storage
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

      // ✅ Get public URL using getAdminClient()
      const { data: publicUrlData } = supabaseConfig.getAdminClient().storage
        .from(this.config.storageBucket)
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      console.log('✅ Upload successful:', publicUrl);
      return publicUrl;

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * ⭐ Delete file từ Supabase Storage
   */
  async deleteFromSupabase(imageUrl) {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/storage/v1/object/public/product-images/');
      if (urlParts.length < 2) {
        throw new Error('Invalid image URL format');
      }
      
      const filePath = urlParts[1];

      // ✅ Use getAdminClient()
      const { error } = await supabaseConfig.getAdminClient().storage
        .from(this.config.storageBucket)
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        throw new Error('Failed to delete file: ' + error.message);
      }

      console.log('✅ File deleted:', filePath);
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  /**
   * ⭐ Main middleware function for product routes
   */
  async handleUpload(req, res, next) {
    try {
      console.log('🔄 Starting upload middleware...');
      
      const contentType = req.headers['content-type'] || '';
      
      if (!contentType.includes('multipart/form-data')) {
        console.log('⏭️ Not multipart, skipping upload middleware');
        return await next();  // ⭐ AWAIT next()
      }

      // ✅ Buffer stream FIRST before parsing
      console.log('📦 Buffering request stream...');
      const buffer = await this.bufferRequestStream(req);
      console.log(`✅ Stream buffered: ${buffer.length} bytes`);

      // ✅ Parse from buffer instead of stream
      const { files, fields } = await this.parseMultipartData(buffer, req.headers);
      
      console.log(`📦 Parsed ${files.length} file(s), ${Object.keys(fields).length} field(s)`);

      // Attach fields to req.body
      req.body = fields;

      // Process uploaded files
      if (files.length > 0) {
        const file = files[0]; // Take first file
        
        // Upload to Supabase
        const imageUrl = await this.uploadToSupabase(file);
        
        // Attach image URL to req.body
        req.body.image_url = imageUrl;
        
        console.log('✅ File uploaded successfully:', imageUrl);
      }

      await next();  // ⭐ AWAIT next()

    } catch (error) {
      console.error('❌ Upload middleware error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message || 'Upload failed'
      }));
    }
  }
  /**
   * ⭐ Convert string fields to proper types
   */
  convertFieldTypes(fields) {
    const converted = { ...fields };

    // Convert numeric fields
    const integerFields = ['category_id', 'stock', 'quantity', 'variant_id'];
    const floatFields = ['base_price', 'price'];

    integerFields.forEach(field => {
      if (converted[field] !== undefined && converted[field] !== '') {
        converted[field] = parseInt(converted[field], 10);
      }
    });

    floatFields.forEach(field => {
      if (converted[field] !== undefined && converted[field] !== '') {
        converted[field] = parseFloat(converted[field]);
      }
    });

    return converted;
  }

  /**
   * ⭐ Generate storage file path - now uses configurable path
   */
  generateStoragePath(filename) {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop();
    const fileName = `${timestamp}_${randomStr}.${ext}`;
    
    // If config has userId (for avatars), include it in path
    if (this.config.userId) {
      return `${this.config.storagePath}/${this.config.userId}/${fileName}`;
    }
    
    return `${this.config.storagePath}/${fileName}`;
  }
}

// ✅ Export middleware instance
const uploadMiddleware = new UploadMiddleware();
export default uploadMiddleware;

// ✅ UPDATED: Export factory functions for different upload types
/**
 * 📌 Create product upload middleware
 */
export function createProductUploadMiddleware() {
  return new UploadMiddleware({
    storageBucket: 'product-images',
    storagePath: 'products',
    maxFileSize: 5 * 1024 * 1024 // 5MB
  });
}

/**
 * 📌 Create avatar upload middleware
 */
export function createAvatarUploadMiddleware(userId) {
  return new UploadMiddleware({
    storageBucket: 'avatars',
    storagePath: 'avatars',
    userId: userId, // Include user ID in path
    maxFileSize: 5 * 1024 * 1024 // 5MB (matching bucket limit)
  });
}
