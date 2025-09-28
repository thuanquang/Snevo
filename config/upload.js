// 📤 File Upload Configuration
// File upload configuration and settings

class UploadConfig {
    constructor() {
        this.maxFileSize = process.env.MAX_FILE_SIZE || 5 * 1024 * 1024; // 5MB
        this.allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif'];
        this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    }

    // Get upload configuration
    getConfig() {
        return {
            maxFileSize: this.maxFileSize,
            allowedTypes: this.allowedTypes,
            uploadPath: this.uploadPath
        };
    }

    // Check if file type is allowed
    isAllowedType(mimeType) {
        return this.allowedTypes.includes(mimeType);
    }

    // Check if file size is valid
    isValidSize(fileSize) {
        return fileSize <= this.maxFileSize;
    }
}

module.exports = new UploadConfig();
