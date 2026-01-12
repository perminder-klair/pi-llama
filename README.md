Create a systemd service:

```bash
sudo tee /etc/systemd/system/llama.service << 'EOF'
[Unit]
Description=LLaMA Server
After=network.target

[Service]
Type=simple
User=klair
ExecStart=/home/klair/llama.cpp/build/bin/llama-server -m /home/klair/llama.cpp/models/qwen2.5-0.5b-instruct-q4_0.gguf --host 0.0.0.0 --port 8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start it:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable llama

# Start it now
sudo systemctl start llama
```

**Useful commands:**

```bash
# Check status
sudo systemctl status llama

# View logs
journalctl -u llama -f

# Stop it
sudo systemctl stop llama

# Restart it
sudo systemctl restart llama
```

Now reboot and test:

```bash
sudo reboot
```

After it comes back up, go to `http://<pi-ip>:8080` — should be running automatically!

