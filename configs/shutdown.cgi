#!/bin/bash
echo "Content-Type: application/json"
echo ""
sudo /sbin/shutdown -h now
echo '{"status":"shutting down"}'
