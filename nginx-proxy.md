Install nginx and set it up as a reverse proxy:

```bash
sudo apt install nginx -y
```

Create the config:

```bash
sudo tee /etc/nginx/sites-available/chat << 'EOF'
server {
    listen 80;
    server_name _;
    
    root /home/klair;
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
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Enable chat site
sudo ln -s /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

Now just open:

```
http://<pi-ip>
```

That's it — clean URL, chat loads directly. The nginx proxies API calls to llama-server running on 8080.
