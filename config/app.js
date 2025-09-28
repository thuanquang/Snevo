// 🚀 Application Configuration
// Main application configuration and settings

class AppConfig {
    constructor() {
        this.port = process.env.PORT || 3000;
        this.nodeEnv = process.env.NODE_ENV || 'development';
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.corsOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    }

    // Get configuration object
    getConfig() {
        return {
            port: this.port,
            nodeEnv: this.nodeEnv,
            jwtSecret: this.jwtSecret,
            jwtExpiresIn: this.jwtExpiresIn,
            corsOrigins: this.corsOrigins
        };
    }

    // Check if development
    isDevelopment() {
        return this.nodeEnv === 'development';
    }

    // Check if production
    isProduction() {
        return this.nodeEnv === 'production';
    }
}

module.exports = new AppConfig();
