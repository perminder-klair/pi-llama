# Pi 3 Setup Guide

Manual setup steps for running llama.cpp on a Raspberry Pi 3. For automated setup, use `./setup.sh` instead.

## System Optimization

### Packages to Remove (Optional)

| Package | Purpose | Why Remove |
|---------|---------|------------|
| `triggerhappy` | Global hotkey daemon | Headless server, no keyboard shortcuts needed |
| `logrotate` | Rotates/compresses log files | Uses CPU cycles; logs aren't critical for this use |

```bash
sudo apt remove --purge triggerhappy logrotate
sudo apt autoremove
```

## Hardware Considerations

Pi 3 has **1GB RAM** which limits model choices.

### Expected Performance

| Model | RAM Needed | Speed | Pi 3 Compatible |
|-------|-----------|-------|-----------------|
| Qwen2.5-0.5B Q4_0 | ~400MB | 2-3 tok/s | Yes |
| TinyLlama 1.1B Q4_0 | ~800MB | 1-2 tok/s | Yes |
| Phi-2 2.7B | ~2GB+ | - | No |
| Llama 7B | ~4GB+ | - | No |

## Building llama.cpp

### Install Dependencies

```bash
sudo apt update
sudo apt install git g++ wget build-essential cmake nginx fcgiwrap nodejs npm
```

### Clone and Build

```bash
git clone https://github.com/ggerganov/llama.cpp.git ~/llama.cpp
cd ~/llama.cpp
```

**Option A: CMake build**
```bash
mkdir -p build && cd build
cmake ..
cmake --build . --config Release -j2
```

Binaries will be in `~/llama.cpp/build/bin/`.

**Option B: Makefile (simpler)**
```bash
make -j2
```

Binaries will be in `~/llama.cpp/`.

## Model Download

### Qwen2.5-0.5B-Instruct (Recommended)

**wget method:**
```bash
mkdir -p ~/llama.cpp/models && cd ~/llama.cpp/models
wget https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_0.gguf
```

**huggingface-cli method:**
```bash
pip install huggingface_hub --break-system-packages
huggingface-cli download Qwen/Qwen2.5-0.5B-Instruct-GGUF \
  qwen2.5-0.5b-instruct-q4_0.gguf \
  --local-dir ~/llama.cpp/models
```

### Quantization Options

| Quant | Size | Quality | Recommendation |
|-------|------|---------|----------------|
| q4_0 | ~400MB | Good | Best for Pi 3 |
| q4_k_m | ~450MB | Better | Should work |
| q5_k_m | ~500MB | Even better | Tight fit |
| q8_0 | ~530MB | Best | Risky on 1GB |

## Testing the Installation

**Basic test:**
```bash
~/llama.cpp/build/bin/llama-cli \
  -m ~/llama.cpp/models/qwen2.5-0.5b-instruct-q4_0.gguf \
  -p "Hello from Raspberry Pi!" -n 50
```

**Interactive chat:**
```bash
~/llama.cpp/build/bin/llama-cli \
  -m ~/llama.cpp/models/qwen2.5-0.5b-instruct-q4_0.gguf \
  -cnv -p "You are a helpful assistant."
```

## Shutdown Button Setup

The chat interface includes a power button to shutdown the Pi remotely. This requires:

### 1. Install fcgiwrap
```bash
sudo apt install fcgiwrap
```

### 2. Setup CGI script
```bash
sudo mkdir -p /var/www/cgi-bin
sudo cp shutdown.cgi /var/www/cgi-bin/
sudo chmod +x /var/www/cgi-bin/shutdown.cgi
sudo chown www-data:www-data /var/www/cgi-bin/shutdown.cgi
```

### 3. Allow passwordless shutdown
```bash
echo "www-data ALL=(ALL) NOPASSWD: /sbin/shutdown" | sudo tee /etc/sudoers.d/shutdown
sudo chmod 440 /etc/sudoers.d/shutdown
```

### 4. Add to nginx config
Add this location block to `/etc/nginx/sites-available/chat`:
```nginx
location /cgi-bin/ {
    gzip off;
    root /var/www;
    fastcgi_pass unix:/var/run/fcgiwrap.socket;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME /var/www$fastcgi_script_name;
}
```

## Building the Chat App

The chat interface is a React app that needs to be built:

```bash
cd client
npm install
npm run build
```

Or use the build script:
```bash
./build.sh
```

The build output is in `client/.output/public/`.

## Deploying to nginx

Create a symlink to serve the React app:

```bash
sudo rm -rf /var/www/chat
sudo ln -sf /path/to/pi-llama/client/.output/public /var/www/chat
```

Update nginx config at `/etc/nginx/sites-available/chat`:
```nginx
server {
    listen 80;
    server_name _;

    root /var/www/chat;
    index index.html;

    location / {
        try_files $uri $uri/index.html /index.html;
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

    location /cgi-bin/ {
        gzip off;
        root /var/www;
        fastcgi_pass unix:/var/run/fcgiwrap.socket;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www$fastcgi_script_name;
    }
}
```

## Next Steps

See [README.md](README.md) for systemd service setup and available chat routes.
