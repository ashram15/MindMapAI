# 🚂 Railway Deployment Guide

Railway has better free tier than Render (8GB RAM vs 512MB) and your app should work without modifications!

## Prerequisites

- GitHub repo: `https://github.com/ashram15/MindMapAI`
- Railway account: https://railway.app (sign up with GitHub)
- Gemini API key

---

## 🚀 Quick Deploy (All 3 Services)

### Step 1: Create Railway Project

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select `ashram15/MindMapAI`
4. Railway will auto-detect your services

### Step 2: Deploy Each Service

Railway doesn't auto-detect docker-compose, so you'll create 3 services manually:

#### Service 1: C++ Engine

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select `ashram15/MindMapAI`
3. Configure:
   ```
   Service Name: cpp-engine
   Root Directory: /cpp-engine
   Builder: Dockerfile
   ```
4. **Settings** → **Networking**:
   - Click **"Generate Domain"** (gives you a public URL)
5. **Deploy** (takes ~2 minutes)
6. **Copy the URL**: e.g., `https://cpp-engine-production-xxxx.up.railway.app`

#### Service 2: Python API

1. Click **"+ New"** → **"GitHub Repo"** again
2. Select `ashram15/MindMapAI`
3. Configure:
   ```
   Service Name: python-api
   Root Directory: /python-api
   Builder: Dockerfile
   ```
4. **Variables** tab → Add:
   ```
   GEMINI_API_KEY=AIzaSyD3cjdgovNyVvk10qthxgQ2-JtWAxCP-iQ
   CPP_ENGINE_HOST=https://cpp-engine-production-xxxx.up.railway.app
   DEV_MODE=false
   ```
   (Replace the CPP_ENGINE_HOST with your actual C++ service URL from Step 1)

5. **Settings** → **Networking**:
   - Click **"Generate Domain"**
6. **Deploy** (takes ~5-7 minutes - downloads ML models)
7. **Copy the URL**: e.g., `https://python-api-production-xxxx.up.railway.app`

#### Service 3: Frontend

1. Click **"+ New"** → **"GitHub Repo"** again
2. Select `ashram15/MindMapAI`
3. Configure:
   ```
   Service Name: frontend
   Root Directory: /frontend
   Builder: Dockerfile
   ```
4. **Variables** tab → Add:
   ```
   NEXT_PUBLIC_API_URL=https://python-api-production-xxxx.up.railway.app
   ```
   (Replace with your actual Python API URL from Step 2)

5. **Settings** → **Networking**:
   - Click **"Generate Domain"**
6. **Deploy** (takes ~3-5 minutes)
7. **Your live URL**: e.g., `https://frontend-production-xxxx.up.railway.app`

---

## ✅ Test Your Deployment

1. Open your **frontend URL**: `https://frontend-production-xxxx.up.railway.app`
2. You should see the MindMapAI interface
3. Try searching for "quantum computing" or "artificial intelligence"
4. Watch the 3D graph populate with nodes! 🎉

---

## 🎯 Alternative: Deploy with Railway CLI

If the web UI is confusing, use the CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy all services at once (experimental)
railway up
```

---

## 💰 Railway Pricing

| Plan | RAM | Deployment | Cost |
|------|-----|------------|------|
| **Trial** | 8GB | 3 services | FREE ($5 credit) |
| **Developer** | 8GB | Unlimited | $5/month |
| **Team** | 32GB | Advanced features | $20/month |

Your app uses ~500MB total, so Trial/Developer should work fine.

---

## 🔍 Troubleshooting

### Services won't connect
- Check environment variables are set correctly
- Verify CPP_ENGINE_HOST points to actual C++ service URL (not localhost)
- Check Railway logs: Click service → **"View Logs"**

### Python API crashes
- Check logs for memory errors
- If OOM, upgrade to Developer plan ($5/month)

### Frontend shows "Failed to fetch"
- Check NEXT_PUBLIC_API_URL points to Python API (not localhost)
- Verify Python API is running (check logs)
- Check browser console for CORS errors

### "vectors.bin not found"
- Already fixed! It's in your repo (2.9MB)
- If missing, check cpp-engine logs

---

## 📊 Monitoring

Railway provides:
- **Metrics**: CPU, RAM, Network usage
- **Logs**: Real-time streaming logs
- **Deployments**: History of all deploys
- **Analytics**: Request counts, response times

Access via service → **"Observability"** tab

---

## 🔄 Auto-Deploy

Railway automatically redeploys on every `git push` to main branch!

To disable:
1. Go to service settings
2. **Triggers** → Uncheck "Redeploy on push"

---

## 🆚 Railway vs Render

| Feature | Railway | Render |
|---------|---------|--------|
| Free Tier RAM | 8GB | 512MB |
| Build Time | Faster | Slower |
| Auto-sleep | No (stays awake) | Yes (after 15min) |
| Docker Support | Excellent | Good |
| Setup | Manual (3 services) | Blueprint (auto) |
| **Best For** | Your MindMapAI | Simpler apps |

---

## ⚡ Quick Tips

1. **Keep services warm**: Railway doesn't sleep like Render
2. **Monitor usage**: Check your trial credits in dashboard
3. **Use private networking**: Services can talk via internal URLs (faster)
4. **Enable HTTPS**: Railway auto-provides SSL certificates

---

## 🎉 You're Done!

Your MindMapAI is now live on Railway with:
- ✅ No memory issues (8GB RAM)
- ✅ Fast deployment times
- ✅ Auto-deploy on git push
- ✅ Better performance than Render free tier

Share your frontend URL and show off your project! 🚀

---

## Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Project Issues**: https://github.com/ashram15/MindMapAI/issues
