# Deployment Guide for LeadFlow

This guide covers deploying your LeadFlow application to production using Netlify for the frontend and various options for the backend.

## Architecture Overview

- **Frontend**: React + Vite application (static deployment on Netlify)
- **Backend**: Node.js + Express API server (requires separate hosting)
- **Database**: MongoDB Atlas (cloud database)

## Deployment Options

### Option 1: Netlify + Heroku (Recommended)

#### Frontend Deployment (Netlify)

1. **Connect to Netlify**
   - Push your code to GitHub/GitLab
   - Connect your repository to Netlify
   - Netlify will automatically detect the build settings from `netlify.toml`

2. **Environment Variables**
   - In Netlify dashboard, go to Site settings > Environment variables
   - Add: `VITE_API_URL` = `https://your-heroku-app.herokuapp.com`

3. **Build Settings** (already configured in netlify.toml)
   - Build command: `npm run build`
   - Publish directory: `dist/public`

#### Backend Deployment (Heroku)

1. **Create Heroku App**
   ```bash
   # Install Heroku CLI
   npm install -g heroku
   
   # Login and create app
   heroku login
   heroku create your-leadflow-api
   ```

2. **Configure Environment Variables**
   ```bash
   # Add your MongoDB URI
   heroku config:set MONGODB_URI="your-mongodb-connection-string"
   heroku config:set NODE_ENV="production"
   ```

3. **Deploy**
   ```bash
   # Add Heroku remote
   heroku git:remote -a your-leadflow-api
   
   # Deploy
   git push heroku main
   ```

4. **Update Netlify Config**
   - Update `netlify.toml` line 25 with your Heroku URL
   - Update `client/public/_redirects` with your Heroku URL

### Option 2: Netlify + Railway

1. **Frontend**: Same as Option 1
2. **Backend**: Deploy to Railway.app
   - Connect GitHub repo
   - Set environment variables (MONGODB_URI)
   - Railway auto-deploys on push

### Option 3: Full-Stack on Vercel

1. Deploy entire project to Vercel
2. Add `vercel.json` configuration
3. Set environment variables in Vercel dashboard

## Environment Configuration

### Frontend Environment Variables

Create `.env.production` in the client folder:

```env
VITE_API_URL=https://your-backend-url.herokuapp.com
```

### Backend Environment Variables

Required for production:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
PORT=5000
```

## Pre-Deployment Checklist

- [ ] MongoDB Atlas database is accessible from 0.0.0.0/0
- [ ] All API endpoints are tested and working
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Backend starts without errors
- [ ] CORS is configured for production domains
- [ ] All environment variables are set
- [ ] Database connection is verified

## Build Commands

### Development
```bash
npm run dev
```

### Production Build
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Troubleshooting

### Common Issues

1. **API calls failing**
   - Verify `VITE_API_URL` is set correctly
   - Check CORS configuration in backend
   - Ensure backend is deployed and accessible

2. **Database connection issues**
   - Verify MongoDB URI is correct
   - Check network access in MongoDB Atlas (allow 0.0.0.0/0)
   - Ensure database user has proper permissions

3. **Build failures**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json

### Performance Optimization

1. **Frontend**
   - Static assets are cached for 1 year
   - Gzip compression enabled
   - Bundle optimization with Vite

2. **Backend**
   - MongoDB connection pooling
   - API response caching
   - Proper indexing on database

## Security Considerations

- API keys stored as environment variables
- HTTPS enabled on all deployments
- Security headers configured in netlify.toml
- MongoDB network access restricted
- Input validation on all API endpoints

## Monitoring

- Netlify: Built-in analytics and monitoring
- Heroku: Add-ons available for monitoring
- MongoDB Atlas: Built-in monitoring and alerts

For any deployment issues, check the application logs and ensure all environment variables are properly configured.