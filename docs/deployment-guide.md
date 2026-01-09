# Artha Trading Journal - Deployment Guide

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Setup](#4-database-setup)
5. [SnapTrade Integration Setup](#5-snaptrade-integration-setup)
6. [Deployment Options](#6-deployment-options)
7. [Post-Deployment Checklist](#7-post-deployment-checklist)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

Before deploying Artha, ensure you have the following:

### 1.1 Required Software

| Software | Minimum Version | Download Link |
|----------|-----------------|---------------|
| Node.js | 22.x | https://nodejs.org/ |
| pnpm | 9.x | https://pnpm.io/installation |
| Git | 2.x | https://git-scm.com/ |

### 1.2 Required Accounts

- **SnapTrade Developer Account**: https://snaptrade.com/
- **Vercel Account** (for Vercel deployment): https://vercel.com/
- **Railway Account** (for Railway deployment): https://railway.app/

### 1.3 Verify Installation

Open a terminal and run:

```bash
# Check Node.js version
node --version
# Should output: v22.x.x or higher

# Check pnpm version
pnpm --version
# Should output: 9.x.x or higher

# Check Git version
git --version
# Should output: git version 2.x.x
```

---

## 2. Local Development Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/pravaha.git

# Navigate to the project directory
cd pravaha
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
pnpm install
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your values
nano .env
# or use your preferred text editor
```

### Step 4: Set Up the Database

```bash
# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev

# (Optional) Seed the database with sample data
pnpm prisma db seed
```

### Step 5: Start the Development Server

```bash
# Start the development server
pnpm dev
```

The application will be available at `http://localhost:3000`

---

## 3. Environment Configuration

### 3.1 Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# SnapTrade API Configuration
SNAPTRADE_CLIENT_ID="your_snaptrade_client_id"
SNAPTRADE_CONSUMER_KEY="your_snaptrade_consumer_key"

# Application URL (for OAuth callbacks)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# (Optional) Enable debug mode
DEBUG="false"
```

### 3.2 Variable Descriptions

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Database connection string | Yes | `file:./dev.db` |
| `SNAPTRADE_CLIENT_ID` | SnapTrade API client ID | Yes | `abc123...` |
| `SNAPTRADE_CONSUMER_KEY` | SnapTrade API consumer key | Yes | `xyz789...` |
| `NEXT_PUBLIC_APP_URL` | Public URL of your application | Yes | `https://artha.example.com` |

### 3.3 Getting SnapTrade Credentials

1. Go to https://snaptrade.com/
2. Sign up for a developer account
3. Create a new application
4. Copy the Client ID and Consumer Key
5. Add them to your `.env` file

---

## 4. Database Setup

### 4.1 Development (SQLite)

SQLite is used by default for development. No additional setup required.

```bash
# The database file will be created at:
# prisma/dev.db
```

### 4.2 Production (PostgreSQL) - Recommended

For production, we recommend using PostgreSQL:

#### Step 1: Update `schema.prisma`

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

#### Step 2: Update Environment Variable

```env
DATABASE_URL="postgresql://user:password@host:5432/artha?schema=public"
```

#### Step 3: Run Migrations

```bash
# Generate new migration for PostgreSQL
pnpm prisma migrate dev --name init

# Deploy migrations to production
pnpm prisma migrate deploy
```

---

## 5. SnapTrade Integration Setup

### 5.1 Register for SnapTrade

1. Visit https://snaptrade.com/
2. Click "Get Started" or "Sign Up"
3. Complete the registration process
4. Verify your email address

### 5.2 Create an Application

1. Log in to the SnapTrade dashboard
2. Navigate to "Applications" or "API Keys"
3. Click "Create New Application"
4. Fill in the required information:
   - **App Name**: Artha Trading Journal
   - **Description**: Personal trading journal application
   - **Redirect URI**: `http://localhost:3000/auth/callback` (for development)
5. Save your Client ID and Consumer Key

### 5.3 Configure OAuth Redirect URIs

Add all the URLs where your app will be deployed:

```
http://localhost:3000/auth/callback          # Development
https://artha.vercel.app/auth/callback       # Vercel
https://artha.example.com/auth/callback      # Custom domain
```

---

## 6. Deployment Options

### Option A: Deploy to Vercel (Recommended)

Vercel is the recommended platform for Next.js applications.

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Deploy

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Step 3: Configure Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add all required environment variables:
   - `DATABASE_URL`
   - `SNAPTRADE_CLIENT_ID`
   - `SNAPTRADE_CONSUMER_KEY`
   - `NEXT_PUBLIC_APP_URL`

#### Step 4: Set Up Database

For Vercel, you can use:
- **Vercel Postgres**: Built-in PostgreSQL database
- **Neon**: Serverless PostgreSQL
- **Supabase**: PostgreSQL with additional features
- **PlanetScale**: MySQL-compatible serverless database

### Option B: Deploy to Railway

Railway provides easy deployment with built-in databases.

#### Step 1: Create Railway Account

1. Go to https://railway.app/
2. Sign up with GitHub

#### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your Artha repository

#### Step 3: Add PostgreSQL

1. In your project, click "New"
2. Select "Database" > "PostgreSQL"
3. Railway will automatically set `DATABASE_URL`

#### Step 4: Configure Environment Variables

1. Click on your service
2. Go to "Variables"
3. Add:
   - `SNAPTRADE_CLIENT_ID`
   - `SNAPTRADE_CONSUMER_KEY`
   - `NEXT_PUBLIC_APP_URL`

#### Step 5: Deploy

Railway will automatically deploy when you push to your repository.

### Option C: Deploy to DigitalOcean App Platform

#### Step 1: Create DigitalOcean Account

1. Go to https://digitalocean.com/
2. Sign up and add billing

#### Step 2: Create App

1. Navigate to "Apps" in the control panel
2. Click "Create App"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build Command**: `pnpm build`
   - **Run Command**: `pnpm start`

#### Step 3: Add Database

1. In your app, click "Add Resource"
2. Select "Database"
3. Choose PostgreSQL
4. The `DATABASE_URL` will be auto-configured

#### Step 4: Environment Variables

Add the remaining variables in the app settings.

### Option D: Self-Hosted (VPS)

For full control, deploy to a VPS like DigitalOcean Droplet or AWS EC2.

#### Step 1: Set Up Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 for process management
npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install -y nginx
```

#### Step 2: Clone and Build

```bash
# Clone repository
git clone https://github.com/your-username/pravaha.git /var/www/artha
cd /var/www/artha

# Install dependencies
pnpm install

# Build for production
pnpm build
```

#### Step 3: Configure Environment

```bash
# Create .env file
nano .env
# Add all environment variables
```

#### Step 4: Set Up PM2

```bash
# Start application with PM2
pm2 start npm --name "artha" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

#### Step 5: Configure Nginx

```nginx
# /etc/nginx/sites-available/artha
server {
    listen 80;
    server_name artha.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/artha /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6: Set Up SSL (HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d artha.example.com

# Certificate auto-renewal is set up automatically
```

---

## 7. Post-Deployment Checklist

After deploying, verify the following:

### 7.1 Application Health

- [ ] Application loads without errors
- [ ] Dashboard displays correctly
- [ ] Navigation works between pages
- [ ] Theme switching works (dark/light mode)

### 7.2 Database Connection

- [ ] Database migrations applied successfully
- [ ] Can create new users
- [ ] Can store and retrieve data

### 7.3 SnapTrade Integration

- [ ] "Connect Broker" button works
- [ ] OAuth redirect works correctly
- [ ] Can successfully connect a broker account
- [ ] Trade sync works properly

### 7.4 Security

- [ ] HTTPS is enabled
- [ ] Environment variables are not exposed
- [ ] API endpoints return appropriate errors
- [ ] CORS is configured correctly

### 7.5 Performance

- [ ] Page load time is acceptable (<3 seconds)
- [ ] Images are optimized
- [ ] Caching is enabled

---

## 8. Troubleshooting

### Issue: "Database connection failed"

**Solution:**
1. Check `DATABASE_URL` is correctly set
2. Ensure database server is running
3. Verify network connectivity to database

```bash
# Test database connection
pnpm prisma db pull
```

### Issue: "SnapTrade authentication failed"

**Solution:**
1. Verify API credentials are correct
2. Check redirect URI is registered in SnapTrade
3. Ensure `NEXT_PUBLIC_APP_URL` matches actual URL

### Issue: "Build failed on deployment"

**Solution:**
```bash
# Clear build cache
rm -rf .next
pnpm install
pnpm build
```

### Issue: "Styles not loading correctly"

**Solution:**
1. Clear browser cache
2. Rebuild CSS: `pnpm build`
3. Check for Tailwind CSS configuration issues

### Issue: "Environment variables not working"

**Solution:**
1. Restart the server after changing env vars
2. For client-side vars, ensure they start with `NEXT_PUBLIC_`
3. Check for typos in variable names

---

## Support

For additional help:
- GitHub Issues: https://github.com/your-username/pravaha/issues
- Documentation: Check the `/docs` folder

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Claude Code Assistant*
