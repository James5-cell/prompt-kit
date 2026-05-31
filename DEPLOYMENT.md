# Deployment Guide

## 🚀 Deployment Status

### ✅ Firebase Hosting - Deployed Successfully
- **URL**: https://prompt-kit-7a67e.web.app
- **Console**: https://console.firebase.google.com/project/prompt-kit-7a67e/overview
- **Status**: ✅ Live and running

### ⚠️ GitHub - Manual Push Required
Due to SSL certificate issues in the automated environment, GitHub push needs to be done manually.

## 📋 Deployment Steps

### Firebase Hosting Deployment

The project has been successfully deployed to Firebase Hosting. To redeploy:

```bash
# Build the project
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

Or use the npm script:
```bash
npm run deploy:hosting
```

### GitHub Deployment

To push changes to GitHub, run:

```bash
# Add all changes
git add -A

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push origin main
```

If you encounter SSL certificate issues, you can:

1. **Use SSH instead** (recommended):
   ```bash
   git remote set-url origin git@github.com:James5-cell/prompt-kit.git
   git push origin main
   ```

2. **Or configure Git to skip SSL verification** (not recommended for production):
   ```bash
   git config --global http.sslVerify false
   ```

## 🔧 Configuration Files

### Firebase Configuration
- **firebase.json**: Hosting configuration
- **.firebaserc**: Project ID configuration
- **firestore.rules**: Firestore security rules

### Vercel Configuration
- **vercel.json**: Vercel deployment configuration (for API proxy)
- **api/nvidia/**: Serverless functions for NVIDIA API proxy

## 📝 Notes

1. **Build Output**: The `dist/` folder contains the production build
2. **Environment Variables**: Make sure to configure API keys in the Settings page after deployment
3. **CORS**: NVIDIA API proxy is configured via Vercel serverless functions
4. **Firebase**: Currently using Firebase Hosting. Firestore is configured but not fully integrated yet.

## 🔄 Continuous Deployment

### Option 1: GitHub Actions (Recommended)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: prompt-kit-7a67e
```

### Option 2: Firebase CLI
Use Firebase CLI with CI/CD integration.

## 🌐 Live URLs

- **Firebase Hosting**: https://prompt-kit-7a67e.web.app
- **Vercel** (if configured): Check Vercel dashboard
- **GitHub Repository**: https://github.com/James5-cell/prompt-kit

## 📞 Support

If you encounter deployment issues:
1. Check Firebase Console for deployment logs
2. Verify build output in `dist/` folder
3. Check Firebase project permissions
4. Verify API keys are configured correctly
