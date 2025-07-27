# Expense Tracker - Netlify Deployment Guide

## Step-by-Step Netlify Deployment

### Option 1: Direct Upload (Fastest)

1. **Download your project files**
   - Go to Files panel in Replit
   - Click the download button to get a ZIP file
   - Extract the ZIP file on your computer

2. **Build the project locally**
   ```bash
   npm install
   npm run build
   ```
   This creates a `dist/public` folder with your built app

3. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com) and sign up (free)
   - Click "Add new site" → "Deploy manually"
   - Drag and drop the `dist/public` folder
   - Your app will be live in seconds!

### Option 2: GitHub Integration (Recommended)

1. **Push to GitHub**
   - Create a new repository on GitHub
   - Push your Replit code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com) and sign up
   - Click "Add new site" → "Import from Git"
   - Connect your GitHub account
   - Select your repository
   - Build settings are auto-detected from `netlify.toml`
   - Click "Deploy site"

### Option 3: Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and deploy**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist/public
   ```

## Install on Mobile

Once deployed, you'll get a URL like `yourapp.netlify.app`

**Android (Chrome):**
1. Open the URL in Chrome
2. Tap menu → "Add to Home screen"
3. Tap "Install"

**iPhone (Safari):**
1. Open the URL in Safari
2. Tap Share → "Add to Home Screen"
3. Tap "Add"

## Features After Deployment

✅ **Fully Offline**: Works without internet after first visit
✅ **Mobile App**: Installs like a native app
✅ **Fast Loading**: Optimized PWA performance
✅ **Auto Updates**: Updates automatically when you redeploy
✅ **Free Hosting**: Netlify free tier includes HTTPS and custom domains

## Troubleshooting

- **Build fails**: Check that all dependencies are in package.json
- **Routes not working**: The netlify.toml file handles SPA routing
- **Mobile install not showing**: Ensure you're using HTTPS (automatic on Netlify)

## Custom Domain (Optional)

1. In Netlify dashboard → Domain settings
2. Add your custom domain
3. Update DNS records as instructed
4. Free SSL certificate included!