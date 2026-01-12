# Pi LLaMA

A Raspberry Pi setup for running a self-hosted LLaMA chat server using llama.cpp.

## Prerequisites

llama.cpp must be built and installed at `~/llama.cpp/` with a model:
- Binary: `~/llama.cpp/build/bin/llama-server`
- Model: `~/llama.cpp/models/qwen2.5-0.5b-instruct-q4_0.gguf`

## Setup

### 1. Create the systemd service

```bash
sudo tee /etc/systemd/system/llama.service << 'EOF'
[Unit]
Description=LLaMA Server
After=network.target

[Service]
Type=simple
User=klair
ExecStart=/home/klair/llama.cpp/build/bin/llama-server -m /home/klair/llama.cpp/models/qwen2.5-0.5b-instruct-q4_0.gguf --host 0.0.0.0 --port 8080 --path /home/klair/chat
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable llama
sudo systemctl start llama
```

### 2. Setup nginx reverse proxy

Install nginx:

```bash
sudo apt install nginx -y
```

Create the web directory and copy the chat interface:

```bash
sudo mkdir -p /var/www/chat
sudo cp ~/chat.html /var/www/chat/
sudo chown -R www-data:www-data /var/www/chat
```

Create the nginx config:

```bash
sudo tee /etc/nginx/sites-available/chat << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/chat;
    index chat.html;

    location / {
        try_files $uri $uri/ /chat.html;
    }

    location /v1/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080;
    }
}
EOF
```

Enable it:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Useful Commands

```bash
# Check status
sudo systemctl status llama

# View logs
journalctl -u llama -f

# Stop/restart
sudo systemctl stop llama
sudo systemctl restart llama
```

## Access

Open `http://<pi-ip>` in your browser. The chat interface loads directly, with nginx proxying API calls to llama-server on port 8080.
