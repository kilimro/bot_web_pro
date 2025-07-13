<p align="right">
   <strong><a href="./README.md">中文</a></strong> | English
</p>
<div>

![BOT_WEB](./img/logo.png)
# BOT_WEB_PRO

## Introduction
An enhanced version of BOT_WEB with improved UI layout, featuring new functionalities including registration, login proxy, multi-user support, and more. The backend is built with Node.js. Frontend code is located in the project root directory, while backend code resides in the `server` folder. This project utilizes Supabase as its database (free tier available, or can be self-hosted).

We welcome contributions from developers! Due to limited time availability, further development is currently constrained...

### Deployment Preview
![Deployment Preview 0](./img/666.png)
![Deployment Preview 1](./img/777.png)
![Deployment Preview 2](./img/888.png)

### Special Notes
Login proxies can be configured in `src/pages/BotsPage.tsx` using the following format:
```bash
const REGION_PROXIES = [
  { label: 'Beijing (Default)', value: 'beijing', proxy: '' }, // Protocol deployment address field
  { label: 'Henan', value: 'henan', proxy: 'socks5://GP0X6IG93S:91563817@127.0.0.1:13519' },
  // Additional regions can be added here
];
```
#### Default Credentials: admin@example.com / admin (can be modified in the database)

## 🚀 Quick Deployment

### Option 1: One-Click Vercel Deployment (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kilimro/m_botweb)

#### 1. Deploy Frontend to Vercel

1. **Click the "Deploy with Vercel" button above**
   - Connect your GitHub account and import the project

2. **Configure Environment Variables**
   Add these variables in Vercel's environment settings:
   ```
   VITE_SUPABASE_URL=Your_Supabase_Project_URL
   VITE_SUPABASE_ANON_KEY=Your_Supabase_anon_public_Key
   SUPABASE_SERVICE_ROLE_KEY=Your_SUPABASE_SERVICE_ROLE_KEY
   VITE_API_ADMIN_KEY=Set_an_admin_secret_key
   ```

3. **Begin Deployment**
   - Click "Deploy"
   - Wait for completion (typically 2-3 minutes)

4. **Access Application**
   - Your app will be available at `https://your-project.vercel.app`

#### 2. Initialize Supabase Database

1. **Register with Supabase**
   - Visit [Supabase](https://supabase.io/)
   - Create a new account or log in
   - Create a new project, noting the project URL and anon key

2. **Import Database Schema**
   - In Supabase console, navigate to SQL Editor
   - Click "New query"
   - Copy and execute the complete SQL script provided in the original Chinese documentation

3. **Set Up Authentication**
   - Go to "Authentication" > "Settings"
   - Enable "Email" authentication
   - Optional: Disable email confirmation (for development)

#### 3. Deploy Backend Server (Optional)

For full WebSocket functionality:

1. **Choose a hosting provider**
   - [Railway](https://railway.app/)
   - [Render](https://render.com/)
   - [DigitalOcean](https://www.digitalocean.com/)
   - Any Node.js-compatible server

2. **Deploy backend code**
   ```bash
   cd server
   npm install
   node wss-service.js
   ```

3. **Configure environment variables**
   ```
   VITE_SUPABASE_URL=Your_Supabase_Project_URL
   VITE_SUPABASE_ANON_KEY=Your_Supabase_anon_public_Key
   SUPABASE_SERVICE_ROLE_KEY=Your_SUPABASE_SERVICE_ROLE_KEY
   ```

### Option 2: Local Deployment

Follow the same steps as outlined in the Chinese documentation for:
1. Supabase registration
2. Database import
3. Backend deployment
4. Frontend deployment

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + WebSocket
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (frontend) + Optional standalone server (backend)
- **State Management**: React Context + Supabase Realtime

## 📝 Additional Notes

- Requires Node.js 16+ and npm
- Supabase free tier has limitations - evaluate upgrade needs
- Frontend environment variables must be prefixed with `VITE_`
- Production environments should use HTTPS and secure variable management

## 🤝 Contributions

Issues and PRs are welcome!

## 📄 License

MIT License

### If you find this project helpful, consider supporting:
![Support](./img/dashang.png)
```
