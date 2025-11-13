# KeyScopeX - Update Commands

## 🔄 One-Command Updates from GitHub

### **For Extension (Local Machine)**

#### Option 1: Using Update Script
```bash
cd KeyScopeX && chmod +x update.sh && ./update.sh
```

#### Option 2: Manual One-Liner
```bash
cd KeyScopeX && git pull origin main && npm install && cd frontend && npm install && cd .. && npm run buildext && echo "✅ Extension updated! Reload in chrome://extensions/"
```

---

### **For Panel (On VPS Server 23.95.75.174)**

#### Option 1: Using Update Script
```bash
cd /var/www/keyscopex/KeyScopeX && chmod +x update-panel.sh && sudo ./update-panel.sh
```

#### Option 2: Manual One-Liner
```bash
cd /var/www/keyscopex/KeyScopeX && git pull origin main && sudo cp -r panel/* /var/www/keyscopex/panel/ && sudo chmod -R 755 /var/www/keyscopex/panel && sudo chown -R www-data:www-data /var/www/keyscopex/panel && sudo systemctl restart nginx && echo "✅ Panel updated!"
```

---

## 📋 **Complete Update Flow**

### Update Everything (Extension + Panel)

#### On Your Local Machine:
```bash
cd KeyScopeX
git pull origin main
npm run buildext
```

#### On Your VPS:
```bash
ssh root@23.95.75.174
cd /var/www/keyscopex/KeyScopeX
git pull origin main
cp -r panel/* /var/www/keyscopex/panel/
systemctl restart nginx
```

---

## ⚡ **Super Quick Updates**

### Extension Only:
```bash
cd KeyScopeX && git pull && npm run buildext
```
Then reload extension in `chrome://extensions/`

### Panel Only:
```bash
ssh root@23.95.75.174 "cd /var/www/keyscopex/KeyScopeX && git pull && cp -r panel/* /var/www/keyscopex/panel/ && systemctl restart nginx"
```

---

## 🔍 **Verify Updates**

### Check Extension Version:
- Open extension
- Check footer: "KeyScopeX Extension v1.0.0"
- New features should appear

### Check Panel Version:
```bash
curl https://keyscopex.xproject.live/panel/backend/api/auth.php
```
Should respond with valid JSON

### Check GitHub Sync:
```bash
cd KeyScopeX
git status
# Should say "Your branch is up to date with 'origin/main'"
```

---

## 📦 **What Gets Updated**

### Extension Updates:
- Frontend code (React components)
- Extension core (background, content, inject)
- UI/UX improvements
- New features
- Bug fixes

### Panel Updates:
- Backend APIs
- Database schema changes
- Dashboard pages
- New features
- Security patches

---

## 🔄 **Update Frequency**

### Recommended:
- **Check for updates**: Weekly
- **Extension updates**: When new features added
- **Panel updates**: When backend changes
- **Security updates**: Immediately

### How to Check for Updates:
```bash
cd KeyScopeX
git fetch origin main
git status
# Will show "Your branch is behind 'origin/main'"
```

---

## 🎯 **Quick Reference**

| Task | Command |
|------|---------|
| Update Extension | `cd KeyScopeX && git pull && npm run buildext` |
| Update Panel | `ssh root@23.95.75.174 "cd /var/www/keyscopex/KeyScopeX && git pull && cp -r panel/* /var/www/keyscopex/panel/"` |
| Check Updates | `cd KeyScopeX && git fetch && git status` |
| Rebuild Extension | `npm run buildext` |
| Restart Panel | `systemctl restart nginx php8.1-fpm` |

---

## ⚠️ **Important Notes**

1. **Always backup before updating**:
   ```bash
   cp -r /var/www/keyscopex/panel /var/www/keyscopex/panel-backup-$(date +%Y%m%d)
   ```

2. **Database updates**: If schema changes, run migration scripts

3. **Extension updates**: Users must reload extension in `chrome://extensions/`

4. **Config files**: Your database.php won't be overwritten (it's gitignored)

---

Made with 🧡 by **LineWatchX Project**

