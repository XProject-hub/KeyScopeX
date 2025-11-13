# KeyScopeX Website Deployment Guide

## 🌐 Domain Information

- **Domain**: keyscopex.xproject.live
- **Server IP**: 23.95.75.174
- **Website**: https://keyscopex.xproject.live

---

## 📋 DNS Configuration

Make sure your domain DNS is configured correctly:

```
Type: A Record
Name: keyscopex
Value: 23.95.75.174
TTL: 3600 (or Auto)
```

### Verify DNS

```bash
# Check if DNS is propagating
dig keyscopex.xproject.live

# Or use nslookup
nslookup keyscopex.xproject.live
```

---

## 🚀 Quick Deployment (Ubuntu Server)

### One-Command Deployment

```bash
# Clone repository and deploy
git clone https://github.com/XProject-hub/KeyScopeX.git && cd KeyScopeX && sudo chmod +x deploy-website.sh && sudo ./deploy-website.sh
```

### Step-by-Step Deployment

```bash
# 1. SSH into your VPS
ssh root@23.95.75.174

# 2. Clone the repository
git clone https://github.com/XProject-hub/KeyScopeX.git
cd KeyScopeX

# 3. Make deployment script executable
chmod +x deploy-website.sh

# 4. Run deployment script
sudo ./deploy-website.sh
```

---

## 🔧 Manual Deployment Steps

### 1. Install Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 2. Create Web Directory

```bash
sudo mkdir -p /var/www/keyscopex
```

### 3. Copy Website Files

```bash
sudo cp -r docs/* /var/www/keyscopex/
```

### 4. Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/keyscopex
sudo chmod -R 755 /var/www/keyscopex
```

### 5. Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/keyscopex

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/keyscopex /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6. Configure Firewall

```bash
# If using UFW
sudo ufw allow 'Nginx Full'
sudo ufw status
```

---

## 🔒 SSL Certificate Setup (HTTPS)

### Install Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### Obtain SSL Certificate

```bash
sudo certbot --nginx -d keyscopex.xproject.live
```

Certbot will:
- Automatically obtain and install SSL certificate
- Configure Nginx for HTTPS
- Set up automatic renewal

### Test SSL Renewal

```bash
sudo certbot renew --dry-run
```

### Manual Renewal

```bash
sudo certbot renew
```

---

## 📁 File Structure on Server

```
/var/www/keyscopex/
├── index.html              # Main landing page
├── CNAME                   # Domain configuration
└── assets/                 # Images, CSS, JS (if any)

/etc/nginx/
├── sites-available/
│   └── keyscopex          # Nginx config
└── sites-enabled/
    └── keyscopex          # Symlink to config
```

---

## 🧪 Testing Deployment

### Test HTTP Access

```bash
# From your local machine
curl http://keyscopex.xproject.live
curl http://23.95.75.174

# Should return the HTML content
```

### Test HTTPS (after SSL setup)

```bash
curl https://keyscopex.xproject.live
```

### Check Nginx Status

```bash
sudo systemctl status nginx
```

### View Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/keyscopex-access.log

# Error logs
sudo tail -f /var/log/nginx/keyscopex-error.log
```

---

## 🔄 Update Website Content

### Method 1: Using Git

```bash
# SSH to server
ssh root@23.95.75.174

# Navigate to repository
cd KeyScopeX

# Pull latest changes
git pull origin main

# Copy updated files
sudo cp -r docs/* /var/www/keyscopex/

# Restart Nginx (if needed)
sudo systemctl restart nginx
```

### Method 2: Direct Upload

```bash
# From your local machine
scp -r docs/* root@23.95.75.174:/var/www/keyscopex/
```

---

## 🛠️ Troubleshooting

### Website Not Loading

```bash
# Check if Nginx is running
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx configuration
sudo nginx -t
```

### DNS Not Resolving

```bash
# Check DNS propagation
dig keyscopex.xproject.live

# Flush local DNS cache (on your local machine)
# Windows:
ipconfig /flushdns

# Linux:
sudo systemd-resolve --flush-caches

# macOS:
sudo dscacheutil -flushcache
```

### Permission Errors

```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/keyscopex
sudo chmod -R 755 /var/www/keyscopex
```

### Port 80/443 Already in Use

```bash
# Check what's using the port
sudo lsof -i :80
sudo lsof -i :443

# If Apache is running, stop it
sudo systemctl stop apache2
sudo systemctl disable apache2
```

---

## 📊 Server Monitoring

### Check Server Resources

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Network connections
netstat -tuln | grep :80
```

### Monitor Nginx Performance

```bash
# Real-time access log
sudo tail -f /var/log/nginx/keyscopex-access.log

# Count requests
sudo grep -c "GET" /var/log/nginx/keyscopex-access.log
```

---

## 🔐 Security Best Practices

1. **Keep system updated**
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

2. **Configure firewall**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   ```

3. **Use SSH keys instead of passwords**
   ```bash
   ssh-copy-id root@23.95.75.174
   ```

4. **Enable automatic security updates**
   ```bash
   sudo apt-get install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

5. **Set up fail2ban**
   ```bash
   sudo apt-get install fail2ban
   sudo systemctl enable fail2ban
   ```

---

## 📈 Performance Optimization

### Enable Gzip Compression

Already configured in `nginx.conf`:
```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

### Enable Caching

Already configured for static assets:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Enable HTTP/2 (after SSL setup)

```nginx
listen 443 ssl http2;
```

---

## 📞 Support

If you encounter issues:

- **GitHub Issues**: https://github.com/XProject-hub/KeyScopeX/issues
- **Server IP**: 23.95.75.174
- **Domain**: keyscopex.xproject.live

---

## 📝 Deployment Checklist

- [ ] DNS A record configured (keyscopex.xproject.live → 23.95.75.174)
- [ ] Repository cloned to server
- [ ] Nginx installed
- [ ] Website files copied to /var/www/keyscopex
- [ ] Permissions set correctly
- [ ] Nginx configured with provided config file
- [ ] Firewall rules added
- [ ] Nginx restarted
- [ ] Website accessible via HTTP
- [ ] SSL certificate installed (optional but recommended)
- [ ] Website accessible via HTTPS
- [ ] DNS propagation verified

---

<div align="center">

**Made with 🧡 by LineWatchX Project**

[Website](https://keyscopex.xproject.live) • 
[GitHub](https://github.com/XProject-hub/KeyScopeX) • 
Server: 23.95.75.174

</div>

