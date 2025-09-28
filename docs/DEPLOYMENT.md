# 🚀 Deployment Guide

## Production Deployment

### Prerequisites

- Node.js 18+ on production server
- PM2 or similar process manager
- Nginx or Apache for reverse proxy
- SSL certificate

### Steps

1. **Build the application:**
```bash
npm run build
```

2. **Set up environment variables:**
```bash
export NODE_ENV=production
export SUPABASE_URL=your_production_url
export SUPABASE_ANON_KEY=your_production_key
```

3. **Start the application:**
```bash
npm start
```

### Docker Deployment

1. **Build Docker image:**
```bash
docker build -t snevo-app .
```

2. **Run container:**
```bash
docker run -p 3000:3000 snevo-app
```

### Cloud Deployment

#### Railway
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

#### Heroku
1. Create Heroku app
2. Set environment variables
3. Deploy with Git

#### Vercel
1. Connect repository
2. Configure build settings
3. Deploy

### Monitoring

- Set up logging
- Monitor performance
- Set up alerts
- Regular backups

### Security

- Use HTTPS
- Set up CORS properly
- Secure environment variables
- Regular security updates
