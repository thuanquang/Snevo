#!/usr/bin/env node

/**
 * Build Script
 * Orchestrates the entire build process including frontend and backend
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(rootDir, '.env') });

console.log('🚀 Starting build process...\n');

async function build() {
    try {
        // Ensure build directory exists
        const buildDir = join(rootDir, 'build');
        await fs.ensureDir(buildDir);
        
        console.log('📦 Building frontend...');
        execSync('npm run build:frontend', { stdio: 'inherit', cwd: rootDir });
        
        console.log('✅ Frontend build completed');
        
        console.log('📋 Copying backend files...');
        
        // Copy backend files to build directory
        const backendSrc = join(rootDir, 'backend');
        const backendDest = join(buildDir, 'backend');
        await fs.copy(backendSrc, backendDest);
        
        // Copy config files
        const configSrc = join(rootDir, 'config');
        const configDest = join(buildDir, 'config');
        await fs.copy(configSrc, configDest);
        
        // Copy package.json
        await fs.copy(join(rootDir, 'package.json'), join(buildDir, 'package.json'));
        
        // Copy schema.sql
        if (await fs.pathExists(join(rootDir, 'schema.sql'))) {
            await fs.copy(join(rootDir, 'schema.sql'), join(buildDir, 'schema.sql'));
        }
        
        console.log('✅ Backend files copied');
        
        console.log('🎯 Creating production package.json...');
        
        // Create production package.json (without devDependencies)
        const packageJson = await fs.readJson(join(rootDir, 'package.json'));
        delete packageJson.devDependencies;
        packageJson.scripts = {
            start: 'node backend/server.js'
        };
        
        await fs.writeJson(join(buildDir, 'package.json'), packageJson, { spaces: 2 });
        
        console.log('✅ Build completed successfully!\n');
        console.log('📁 Build output: ./build/');
        console.log('🚀 To run production build: cd build && npm install && npm start');
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

build();

