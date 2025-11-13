# ✅ KeyScopeX Deployment Checklist

## 🎯 PRE-DEPLOYMENT

### Prerequisites
- [ ] VPS server ready (23.95.75.174)
- [ ] Domain configured (keyscopex.xproject.live → 23.95.75.174)
- [ ] SSH access to server
- [ ] MySQL/MariaDB installed
- [ ] Nginx installed
- [ ] PHP 8.0+ installed with php-fpm
- [ ] SSL certificate ready (optional but recommended)

---

## 📦 DEPLOYMENT STEPS

### Phase 1: Database Setup
- [ ] SSH to server: `ssh root@23.95.75.174`
- [ ] Clone repository: `git clone https://github.com/XProject-hub/KeyScopeX.git`
- [ ] Run database schema: `mysql -u root -p < KeyScopeX/panel/database/schema.sql`
- [ ] Create database user:
  ```sql
  CREATE USER 'keyscopex_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
  GRANT ALL PRIVILEGES ON keyscopex_panel.* TO 'keyscopex_user'@'localhost';
  FLUSH PRIVILEGES;
  ```
- [ ] Verify tables created: `mysql -u keyscopex_user -p keyscopex_panel`
- [ ] Check admin user exists: `SELECT * FROM users WHERE is_admin=1;`

### Phase 2: Panel Files
- [ ] Move panel to web directory: `mv KeyScopeX/panel /var/www/keyscopex/`
- [ ] Configure database: Edit `/var/www/keyscopex/panel/backend/config/database.php`
  - [ ] Set DB_USER
  - [ ] Set DB_PASS
- [ ] Create logs directory: `mkdir -p /var/www/keyscopex/panel/logs`
- [ ] Set permissions:
  ```bash
  chmod -R 755 /var/www/keyscopex/panel
  chown -R www-data:www-data /var/www/keyscopex/panel
  chmod 777 /var/www/keyscopex/panel/logs
  ```

### Phase 3: Nginx Configuration
- [ ] Edit Nginx config: `nano /etc/nginx/sites-available/keyscopex`
- [ ] Add PHP location block (see COMPLETE_SYSTEM_GUIDE.md)
- [ ] Test config: `nginx -t`
- [ ] Restart Nginx: `systemctl restart nginx`
- [ ] Test PHP: `curl https://keyscopex.xproject.live/panel/backend/api/auth.php`

### Phase 4: Test Panel
- [ ] Test registration API: 
  ```bash
  curl -X POST https://keyscopex.xproject.live/panel/backend/api/auth.php?action=register \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@test.com","password":"Test123!"}'
  ```
- [ ] Should return license key
- [ ] Test admin login: https://keyscopex.xproject.live/panel/admin/ (admin/admin123)
- [ ] Test user registration: https://keyscopex.xproject.live/panel/public/register.php
- [ ] **CHANGE ADMIN PASSWORD** in database or via panel

### Phase 5: Extension Deployment
- [ ] Extension already built in `extension-release/` folder
- [ ] Load extension in Chrome:
  - [ ] `chrome://extensions/`
  - [ ] Developer mode ON
  - [ ] Load unpacked → Select `extension-release/`
  - [ ] Extension appears with KeyScopeX logo
- [ ] Test extension opens
- [ ] Test settings page loads

### Phase 6: Extension ↔ Panel Integration
- [ ] Register a test user on panel
- [ ] Get test user's license key
- [ ] Open extension → Settings
- [ ] Paste license key in "KeyScopeX Panel License"
- [ ] Click "Activate License"
- [ ] Should show "Panel License Active" ✅
- [ ] Go to any DRM video site
- [ ] Capture keys
- [ ] Keys should auto-sync to panel
- [ ] Login to panel dashboard
- [ ] Verify keys appear in "My Keys"

### Phase 7: Security Hardening
- [ ] Change admin password
- [ ] Update database credentials (strong password)
- [ ] Enable SSL (Let's Encrypt):
  ```bash
  certbot --nginx -d keyscopex.xproject.live
  ```
- [ ] Configure firewall:
  ```bash
  ufw allow 'Nginx Full'
  ufw enable
  ```
- [ ] Disable PHP display_errors in production
- [ ] Set proper file permissions (755 directories, 644 files)

### Phase 8: Final Verification
- [ ] Admin panel accessible
- [ ] User registration works
- [ ] User login works
- [ ] User dashboard shows data
- [ ] Extension connects to panel
- [ ] Keys sync from extension to panel
- [ ] PREMIUM users see all keys
- [ ] FREE users see only own keys
- [ ] All API endpoints responding
- [ ] No errors in logs

---

## 🔧 POST-DEPLOYMENT

### Monitoring
- [ ] Check error logs daily: `tail -f /var/www/keyscopex/panel/logs/error.log`
- [ ] Monitor MySQL: `mysqladmin -u root -p processlist`
- [ ] Check disk space: `df -h`
- [ ] Monitor Nginx: `tail -f /var/log/nginx/keyscopex-access.log`

### Maintenance
- [ ] Backup database weekly:
  ```bash
  mysqldump -u root -p keyscopex_panel > backup-$(date +%Y%m%d).sql
  ```
- [ ] Update extension: `git pull && npm run buildext`
- [ ] Update panel: `git pull` in panel directory
- [ ] Monitor user growth
- [ ] Check for expired licenses

### Optimization
- [ ] Add database indexes if needed
- [ ] Enable MySQL query cache
- [ ] Configure PHP opcache
- [ ] Add Redis for sessions (optional)
- [ ] Setup CDN for assets (optional)

---

## 🎯 SUCCESS CRITERIA

### Extension:
- [x] Loads without errors
- [x] Dark theme working
- [x] Keys capture functional
- [x] Panel license field present
- [x] Auto-sync working
- [x] Dashboard link opens

### Panel:
- [x] Admin login works
- [x] User registration works
- [x] User login works
- [x] License validation works
- [x] Keys API works
- [x] Dashboard displays data
- [x] FREE/PREMIUM differentiation

### Integration:
- [x] Extension validates license
- [x] Keys auto-upload to panel
- [x] Dashboard shows synced keys
- [x] PREMIUM users see all keys
- [x] FREE users limited to own keys

---

## 🐛 TROUBLESHOOTING

### Panel not loading:
```bash
# Check PHP-FPM
systemctl status php8.1-fpm
systemctl restart php8.1-fpm

# Check Nginx
systemctl status nginx
nginx -t
```

### API returning errors:
```bash
# Check PHP error log
tail -f /var/www/keyscopex/panel/logs/error.log

# Check MySQL
systemctl status mysql
```

### Extension not syncing:
- Check console (F12)
- Verify license activated
- Test API manually with curl
- Check panel logs

---

## 📧 ADMIN ACCOUNT

**IMPORTANT**: Change admin credentials!

```sql
-- In MySQL
USE keyscopex_panel;
UPDATE users 
SET password = '$2y$10$NEW_HASH_HERE' 
WHERE username = 'admin';
```

Or register new admin:
```sql
INSERT INTO users (username, email, password, license_key, license_type, is_admin)
VALUES ('youradmin', 'you@email.com', '$2y$10$HASH', UUID(), 'PREMIUM', TRUE);
```

---

## ✅ FINAL CHECKS

- [ ] System deployed
- [ ] Database running
- [ ] APIs responding
- [ ] Admin login works
- [ ] User registration works
- [ ] Extension connects
- [ ] Keys sync successfully
- [ ] Admin password changed
- [ ] SSL enabled
- [ ] Backups configured
- [ ] Monitoring setup

---

## 🎊 LAUNCH!

Once all checkboxes are ticked:

✅ **YOUR KEYSCOPEX SAAS PLATFORM IS LIVE!**

- Users can register and get FREE licenses
- Extension syncs keys to their dashboards
- Admins can upgrade users to PREMIUM
- PREMIUM users access global database
- Complete monitoring and logging

**Congratulations! 🎉**

---

Made with 🧡 by **LineWatchX Project**

**You're ready to launch your DRM key SaaS business!** 🚀

