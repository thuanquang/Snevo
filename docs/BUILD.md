# Build System Documentation

## Overview

The Snevo e-commerce platform uses a custom build system that injects environment variables into the frontend during the build process. This ensures secure handling of credentials and proper configuration management across different environments.

## Environment Variables

### Required Variables

Copy `env.example` to `.env` and fill in your values:

```bash
cp env.example .env
```

#### Supabase Configuration
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

#### Database Configuration
```env
DB_SCHEMA=db_nike
```

#### Frontend Configuration
```env
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
```

#### App Configuration
```env
APP_NAME=Snevo
APP_VERSION=1.0.0
NODE_ENV=development
```

#### Authentication
```env
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d
```

#### Google OAuth (Optional)
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Build Scripts

### Development

For development with environment variables:

```bash
# Generate development config from .env
npm run dev:config

# Start development server with config generation
npm run dev
```

This will:
1. Generate `frontend/assets/js/config.generated.js` with your .env values
2. Start the backend server with file watching

### Production Build

```bash
# Full production build
npm run build
```

This will:
1. Create a `build/` directory
2. Copy and process all frontend files
3. Inject environment variables into configuration
4. Copy backend files
5. Create production-ready `package.json`

### Frontend Only Build

```bash
# Build only frontend with environment injection
npm run build:frontend
```

## File Structure After Build

```
build/
├── frontend/           # Frontend files with injected config
│   ├── assets/
│   │   └── js/
│   │       └── config.js  # Generated with env vars
│   └── pages/
├── backend/           # Backend application files
├── config/           # Configuration files
└── package.json      # Production package.json
```

## Configuration Loading

The frontend uses a smart configuration loading system:

1. **Development**: Tries to load `config.generated.js` (created by `npm run dev:config`)
2. **Fallback**: Falls back to `config.js` with placeholder values
3. **Production**: Uses `config.js` with injected environment variables

## Security Features

- ✅ Environment variables are never committed to git
- ✅ Production builds inject variables at build time
- ✅ Sensitive keys are masked in console output
- ✅ Development warnings for missing configuration
- ✅ Automatic validation of required variables

## Deployment

### Local Production Test

```bash
# Build and serve production version
npm run serve
```

### Deploy to Production

1. Set environment variables on your hosting platform
2. Run build process: `npm run build`
3. Deploy the `build/` directory
4. Run `npm install` in build directory (production dependencies only)
5. Start with `npm start`

### Environment-Specific Builds

For different environments, set `NODE_ENV` before building:

```bash
# Staging build
NODE_ENV=staging npm run build

# Production build
NODE_ENV=production npm run build
```

## Troubleshooting

### Missing Configuration

If you see warnings about missing Supabase configuration:

1. Ensure `.env` file exists in project root
2. Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
3. Run `npm run dev:config` to regenerate development config

### Build Errors

Common issues and solutions:

- **Permission errors**: Ensure build scripts are executable
- **Missing dependencies**: Run `npm install` to install build dependencies
- **Environment variables not loading**: Check `.env` file format and location

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Config file | `config.generated.js` or `config.js` | `config.js` (injected) |
| Environment loading | Runtime from `.env` | Build-time injection |
| Google Auth | Enabled if `GOOGLE_CLIENT_ID` set | Enabled if configured |
| Console warnings | Verbose | Minimal |

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server with config generation |
| `npm run dev:config` | Generate development config from .env |
| `npm run build` | Full production build |
| `npm run build:frontend` | Frontend build only |
| `npm run serve` | Build and serve production version |

## Best Practices

1. **Never commit `.env`** - It's in `.gitignore` for security
2. **Use `env.example`** - Keep it updated with required variables
3. **Test builds locally** - Use `npm run serve` before deploying
4. **Validate environment** - Check console for configuration warnings
5. **Use staging environment** - Test with production-like config before live deployment
