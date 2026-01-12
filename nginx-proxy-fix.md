Permissions issue — nginx runs as `www-data` user and can't read from `/home/klair`. 

Move the chat file to the standard web directory:

```bash
# Create web directory
sudo mkdir -p /var/www/chat

# Copy chat.html there
sudo cp ~/chat.html /var/www/chat/

# Set permissions
sudo chown -R www-data:www-data /var/www/chat
```

Update nginx config:

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

Restart nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

Now try `http://<pi-ip>` again.
