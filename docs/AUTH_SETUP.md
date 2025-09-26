# Authentication Setup Guide

## Overview

The Snevo e-commerce platform now has a fully environment-dependent authentication system with proper Supabase integration and Google OAuth support. All authentication features are dynamically enabled/disabled based on your environment configuration.

## ✅ Completed Changes

### 1. Environment Configuration
- **Created `env.example`** - Comprehensive template with all required variables
- **Enhanced validation** - Backend validates all Supabase credentials on startup
- **Dynamic features** - Frontend features automatically enable/disable based on config

### 2. Backend Authentication
- **Supabase integration** - Fully dependent on environment variables
- **Google OAuth** - Enhanced with proper token verification
- **Validation** - Comprehensive environment variable validation
- **Error handling** - Helpful error messages for configuration issues

### 3. Frontend Authentication
- **Configuration validation** - Real-time validation with user feedback
- **Google OAuth** - Dynamically enabled when properly configured
- **Build system** - Automatic environment variable injection
- **Development mode** - Clear warnings and guidance for setup

### 4. Build System
- **Environment injection** - All scripts now inject environment variables
- **Feature detection** - Automatic enabling/disabling of features
- **Validation** - Build-time validation of configuration
- **Development support** - `npm run dev:config` for development setup

## 🚀 Setup Instructions

### 1. Environment Setup
```bash
# Copy the environment template
cp env.example .env

# Edit .env with your actual credentials
# Required: SUPABASE_URL, SUPABASE_ANON_KEY
# Optional: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

### 2. Supabase Setup
1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from Settings > API
3. Add them to your `.env` file
4. Run your existing `schema.sql` in the Supabase SQL editor

### 3. Google OAuth Setup (Optional)
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add your domain to authorized origins
4. Add the client ID to your `.env` file
5. Configure the Google provider in Supabase Dashboard > Authentication > Providers

### 4. Development
```bash
# Generate development config from .env
npm run dev:config

# Start development server
npm run dev
```

### 5. Production
```bash
# Build with environment variable injection
npm run build

# Serve production build
npm run serve
```

## 🔍 Feature Status

The system now automatically detects and enables features based on your configuration:

### Supabase Authentication
- ✅ **Enabled** when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are valid
- ❌ **Disabled** when credentials are missing or invalid
- 📝 **Shows helpful error messages** for configuration issues

### Google OAuth
- ✅ **Enabled** when `GOOGLE_CLIENT_ID` is valid AND Supabase is configured
- ❌ **Disabled** when Google Client ID is missing or invalid
- 🔄 **Automatically hides/shows** Google login button based on availability

### Email Features
- ✅ **Email verification** - Enabled when Supabase is configured
- ✅ **Password reset** - Enabled when Supabase is configured
- 📧 **Uses your domain** for email templates and redirects

## 🛠️ Configuration Validation

### Backend Validation
- Validates Supabase URL format
- Checks for placeholder values
- Warns about missing service role key
- Provides detailed error messages

### Frontend Validation
- Real-time feature detection
- Console warnings for missing config
- Helpful setup instructions
- Dynamic UI updates based on available features

## 🧪 Testing Your Setup

### Check Configuration
```bash
# Test backend configuration
node -e "require('./config/supabase.js')"

# Generate and check frontend config
npm run dev:config
cat frontend/assets/js/config.generated.js
```

### Expected Output
- ✅ **Supabase configured** - No errors, features enabled
- ⚠️ **Partial setup** - Warnings about missing Google OAuth
- ❌ **Not configured** - Clear error messages with setup instructions

## 📱 Authentication Flow

### Email/Password Authentication
1. User enters credentials
2. Frontend validates input
3. Backend authenticates with Supabase
4. Session tokens stored securely
5. User redirected to dashboard

### Google OAuth Flow
1. User clicks "Continue with Google"
2. Frontend checks if Google OAuth is enabled
3. Redirects to Google OAuth (if enabled)
4. Google redirects back with authorization code
5. Backend verifies with Supabase
6. User account created/updated automatically
7. Session established and user logged in

## 🔧 Troubleshooting

### Common Issues

**"Supabase client not initialized"**
- Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Run `npm run dev:config` to regenerate frontend config

**"Google OAuth is not configured"**
- Add valid `GOOGLE_CLIENT_ID` to your `.env` file
- Ensure it ends with `.apps.googleusercontent.com`
- Configure Google provider in Supabase dashboard

**"Missing required Supabase environment variables"**
- Copy `env.example` to `.env`
- Fill in your actual Supabase project credentials
- Restart your development server

### Getting Help

1. Check the console for detailed error messages
2. Verify your `.env` file matches `env.example`
3. Ensure your Supabase project is properly configured
4. Check that your Google OAuth credentials are valid

## 🎯 Next Steps

With authentication properly configured, you can now:

1. **Test the login flow** - Try both email and Google authentication
2. **Implement user features** - Profile management, order history, etc.
3. **Add role-based access** - Customer vs seller features
4. **Deploy to production** - Use the build system for deployment

The authentication system is now fully environment-dependent and will work seamlessly across development, staging, and production environments with proper configuration.
