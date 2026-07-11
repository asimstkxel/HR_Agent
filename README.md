# HR Job Search Agent

AI-powered job search assistant built with LangGraph, Tavily, and Next.js. Searches for jobs posted in the last 24 hours across the web and LinkedIn, estimates salaries, and researches companies.

## Features

- **Job Search** — Find jobs across the web (last 24 hours only)
- **LinkedIn Search** — LinkedIn-specific job listings
- **Company Research** — Look up company profiles on LinkedIn
- **Salary Estimation** — AI-powered salary estimates with market data
- **Chat UI** — Conversational interface with Next.js frontend

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Framework | LangGraph + LangChain |
| LLM | OpenAI GPT-4.1-nano |
| Search Tool | Tavily API |
| Backend API | FastAPI + Uvicorn |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |

## Project Structure

```
HR_Agent/
├── agent.py                 # LangGraph ReAct agent
├── server.py                # FastAPI backend (port 8000)
├── main.py                  # CLI chat interface
├── tools/
│   ├── job_search.py        # Web job search (Tavily)
│   ├── linkedin_scraper.py  # LinkedIn jobs + company lookup
│   └── salary_estimator.py  # Salary estimation tool
├── frontend/                # Next.js chat UI (port 3000)
│   └── src/
│       ├── app/page.tsx     # Main chat page
│       └── components/      # ChatMessage, ChatInput, Sidebar
├── .agents/skills/          # Orchestrator & agent skills
└── requirements.txt
```

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 20+
- OpenAI API key
- Tavily API key

### 1. Clone the repo

```bash
git clone https://github.com/asimstkxel/HR_Agent.git
cd HR_Agent
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```
OPENAI_API_KEY=sk-your-key-here
TAVILY_API_KEY=tvly-your-key-here
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Run the app

**Terminal 1 — Backend:**

```bash
python3 server.py
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

### CLI Mode (no frontend)

```bash
python3 main.py
```

---

## Deploy on Hostinger VPS

### 1. Connect to your VPS

```bash
ssh root@your-vps-ip
```

### 2. Install system dependencies

```bash
apt update && apt upgrade -y
apt install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx git
```

### 3. Clone the repo

```bash
cd /var/www
git clone https://github.com/asimstkxel/HR_Agent.git
cd HR_Agent
```

### 4. Set up Python backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 5. Create `.env` file

```bash
cp .env.example .env
nano .env
# Add your OPENAI_API_KEY and TAVILY_API_KEY
```

### 6. Set up frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=https://yourdomain.com npm run build
cd ..
```

### 7. Create systemd service for the backend

```bash
cat > /etc/systemd/system/hr-agent-backend.service << 'EOF'
[Unit]
Description=HR Agent FastAPI Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/HR_Agent
Environment=PATH=/var/www/HR_Agent/venv/bin
EnvironmentFile=/var/www/HR_Agent/.env
ExecStart=/var/www/HR_Agent/venv/bin/python3 server.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

### 8. Create systemd service for the frontend

```bash
cat > /etc/systemd/system/hr-agent-frontend.service << 'EOF'
[Unit]
Description=HR Agent Next.js Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/HR_Agent/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

### 9. Enable and start services

```bash
systemctl daemon-reload
systemctl enable hr-agent-backend hr-agent-frontend
systemctl start hr-agent-backend hr-agent-frontend
```

### 10. Configure Nginx reverse proxy

```bash
cat > /etc/nginx/sites-available/hr-agent << 'EOF'
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }
}
EOF

ln -s /etc/nginx/sites-available/hr-agent /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### 11. Set up SSL (optional but recommended)

```bash
certbot --nginx -d yourdomain.com
```

### 12. Update CORS for production

Edit `server.py` and update the allowed origins:

```python
allow_origins=["https://yourdomain.com"],
```

Restart the backend:

```bash
systemctl restart hr-agent-backend
```

### Useful commands

```bash
# Check status
systemctl status hr-agent-backend
systemctl status hr-agent-frontend

# View logs
journalctl -u hr-agent-backend -f
journalctl -u hr-agent-frontend -f

# Restart after code changes
cd /var/www/HR_Agent && git pull
systemctl restart hr-agent-backend
cd frontend && npm run build && systemctl restart hr-agent-frontend
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4.1-nano |
| `TAVILY_API_KEY` | Tavily API key for web search |
| `NEXT_PUBLIC_API_URL` | Backend URL (default: `http://localhost:8000`) |
