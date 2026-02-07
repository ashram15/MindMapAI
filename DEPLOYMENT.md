# 🚀 Deployment Guide - Render

This guide walks you through deploying MindMapAI to Render with all three services.

## Prerequisites

- GitHub repository: `https://github.com/ashram15/MindMapAI`
- Render account (free tier works): https://render.com
- Gemini API key

---

## 🚀 Quick Deploy (Recommended)

**Option 1: Using Blueprint (render.yaml) - Deploy All Services at Once**

1. Go to Render Dashboard → **New** → **Blueprint**
2. Connect your GitHub repo: `ashram15/MindMapAI`
3. Render will auto-detect `render.yaml` and show all 3 services
4. Click **Apply**
5. Go to each service and set the `GEMINI_API_KEY` environment variable
6. Wait for all services to deploy (~5-10 minutes)
7. Done! Your app is live 🎉

**Option 2: Manual Setup (Step-by-Step Below)**

If Blueprint doesn't work or you prefer manual control, follow the detailed steps below.

---

## Step 1: Deploy C++ Vector Engine

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repo: `ashram15/MindMapAI`
3. Configure:

   ```
   Name:            mindmap-cpp-engine
   Region:          Pick closest to you
   Branch:          main
   Root Directory:  cpp-engine
   Runtime:         Docker
   Instance Type:   Free
   ```

4. **Build Command**: (Auto-detected from Dockerfile)
5. Click **Create Web Service**
6. Wait for deployment (2-3 minutes)
7. **Copy the service URL**: e.g., `https://mindmap-cpp-engine.onrender.com`

---

## Step 2: Deploy Python API

1. Render Dashboard → **New** → **Web Service**
2. Connect repo: `ashram15/MindMapAI`
3. Configure:

   ```
   Name:            mindmap-python-api
   Region:          Same as C++ engine
   Branch:          main
   Root Directory:  python-api
   Runtime:         Docker
   Instance Type:   Free
   ```

4. **Environment Variables** (click "Advanced" → "Add Environment Variable"):

   ```
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   CPP_SERVER_URL=https://mindmap-cpp-engine.onrender.com/search
   DEV_MODE=false
   ```

5. Click **Create Web Service**
6. Wait for deployment (5-7 minutes - downloads models)
7. **Copy the service URL**: e.g., `https://mindmap-python-api.onrender.com`

---

## Step 3: Deploy Frontend

### Option A: Static Site (Recommended - Faster & Free)

1. Render Dashboard → **New** → **Static Site**
2. Connect repo: `ashram15/MindMapAI`
3. Configure:

   ```
   Name:              mindmap-frontend
   Branch:            main
   Root Directory:    frontend
   Build Command:     npm install && npm run build
   Publish Directory: .next
   ```

4. **Environment Variables**:

   ```
   NEXT_PUBLIC_API_URL=https://mindmap-python-api.onrender.com
   ```

5. Click **Create Static Site**

### Option B: Web Service (If static doesn't work)

1. Render Dashboard → **New** → **Web Service**
2. Connect repo: `ashram15/MindMapAI`
3. Configure:

   ```
   Name:            mindmap-frontend
   Branch:          main
   Root Directory:  frontend
   Runtime:         Docker
   Instance Type:   Free
   ```

4. **Environment Variables**:

   ```
   NEXT_PUBLIC_API_URL=https://mindmap-python-api.onrender.com
   ```

5. Click **Create Web Service**

---

## Step 4: Update Frontend Code (Required)

Your frontend currently uses `http://localhost:8000`. You need to update it to use environment variables.

**File: `frontend/components/Graph.js`**

Find all instances of:
```javascript
fetch(`http://localhost:8000/...`)
```

Replace with:
```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
fetch(`${API_URL}/...`)
```

See the code changes needed below in the "Code Updates" section.

---

## Important Notes

### ⚠️ Free Tier Limitations

**Render Free Tier:**
- Services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- 750 hours/month free (enough for 1 service running 24/7)

**Solutions:**
- Keep services awake with UptimeRobot (ping every 10 minutes)
- Upgrade to paid tier ($7/month per service)
- Add loading state: "Waking up services..."

### 🌐 Service Communication

Services talk to each other using their Render URLs:
- Frontend → Python API (via browser)
- Python API → C++ Engine (server-to-server)

### 📦 Startup Times

- C++ Engine: ~30 seconds (loads vectors)
- Python API: ~60 seconds (loads ML models)
- Frontend: ~2 minutes (builds Next.js)

### 🔄 Auto-Deploy

Every `git push` triggers automatic redeployment on Render.

---

## Testing Your Deployment

1. **Test C++ Engine**:
   ```bash
   curl -X POST https://mindmap-cpp-engine.onrender.com/search \
     -H "Content-Type: application/json" \
     -d '{"query_vector": [0.1, 0.2, ...]}'  # 384 dimensions
   ```

2. **Test Python API**:
   ```bash
   curl -X POST https://mindmap-python-api.onrender.com/search \
     -H "Content-Type: application/json" \
     -d '{"text": "quantum computing", "k": 5}'
   ```

3. **Test Frontend**:
   - Open: `https://mindmap-frontend.onrender.com`
   - Should see the MindMapAI interface
   - Try searching for a topic

---

## Troubleshooting

### Frontend can't connect to API
- Check CORS in `python-api/api.py` allows your frontend URL
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check browser console for errors

### Python API can't reach C++ Engine
- Verify `CPP_SERVER_URL` environment variable
- Check C++ service is running (not sleeping)

### "Service Unavailable" errors
- Free tier services sleep after 15min inactivity
- Wait 30-60 seconds for wake-up
- Consider UptimeRobot to keep awake

### Build failures
- Check Render logs for specific errors
- Verify Dockerfiles work locally: `docker build -t test .`
- Check all dependencies are in `package.json`/`requirements.txt`

---

## Cost Breakdown

| Service | Render Free Tier | Render Paid |
|---------|------------------|-------------|
| C++ Engine | $0 (with sleep) | $7/month |
| Python API | $0 (with sleep) | $7/month |
| Frontend | $0 (static) | $0 or $7/month |
| **Total** | **FREE** | **$14-21/month** |

---

## Alternative: Deploy All Services Together

If you want ONE deployment instead of three separate services, consider:

**Railway**: Supports docker-compose directly
- Connect GitHub repo
- Railway auto-detects docker-compose.yml
- Set environment variables
- Deploy in one click

**Render Blueprint** (render.yaml):
- Define all services in one YAML file
- Deploy everything with one click
- See `render.yaml` example in this repo

---

## Next Steps

1. ✅ Fix frontend code to use environment variables (see below)
2. ✅ Commit and push changes to GitHub
3. ✅ Create three services on Render following steps above
4. ✅ Set environment variables
5. ✅ Test your live deployment!

---

## Need Help?

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Project Issues**: https://github.com/ashram15/MindMapAI/issues
