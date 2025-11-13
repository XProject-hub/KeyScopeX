# KeyScopeX Panel System

## 🎯 Overview

Complete SaaS platform for KeyScopeX DRM Key Collection with:
- User registration & authentication
- License system (FREE & PREMIUM)
- Admin dashboard
- User dashboard  
- Auto-sync from extension to panel
- Global key database

## 📦 Features

### For Users
- **FREE License**: Register → Get license key → Collect your own keys
- **PREMIUM License**: Access to all keys collected by all users globally

### For Admin
- Track all active extensions
- Manage users (free/premium)
- Create & revoke licenses
- Manually add MPD/keys
- View all collected keys
- Track visitors & statistics

## 🗂️ System Architecture

```
KeyScopeX Panel/
├── backend/                    # PHP Backend API
│   ├── config/
│   │   ├── database.php       # DB connection
│   │   └── config.php         # App config
│   ├── api/
│   │   ├── auth.php          # Authentication
│   │   ├── license.php       # License management
│   │   ├── keys.php          # DRM keys API
│   │   └── admin.php         # Admin API
│   ├── includes/
│   │   ├── functions.php     # Helper functions
│   │   └── auth_check.php    # Auth middleware
│   └── database/
│       └── schema.sql        # Database schema
├── admin/                     # Admin Panel
│   ├── index.php             # Admin dashboard
│   ├── users.php             # User management
│   ├── licenses.php          # License management
│   ├── keys.php              # Keys management
│   └── stats.php             # Statistics
├── user/                      # User Dashboard
│   ├── index.php             # User dashboard
│   ├── keys.php              # My collected keys
│   └── profile.php           # User profile
├── public/                    # Public pages
│   ├── index.php             # Landing page
│   ├── register.php          # User registration
│   ├── login.php             # User login
│   └── logout.php            # Logout
└── assets/                    # CSS/JS/Images
    ├── css/
    ├── js/
    └── img/
```

## 🔑 License Types

### FREE License
- Register account
- Get unique license key
- Collect own DRM keys
- View only own keys
- Limited to personal use

### PREMIUM License
- All FREE features
- Access to global key database
- View all keys from all users
- Priority support
- Unlimited collections

## 💻 Installation

See [PANEL_INSTALLATION.md](PANEL_INSTALLATION.md) for complete setup instructions.

## 🌐 API Endpoints

### Authentication
- `POST /api/auth.php?action=register` - Register new user
- `POST /api/auth.php?action=login` - User login
- `POST /api/auth.php?action=logout` - User logout
- `GET /api/auth.php?action=verify` - Verify session

### License Management
- `GET /api/license.php?action=check` - Check license validity
- `POST /api/license.php?action=activate` - Activate license
- `GET /api/license.php?action=info` - Get license info

### Keys Management
- `POST /api/keys.php?action=submit` - Submit new keys (from extension)
- `GET /api/keys.php?action=list` - List keys (user's or global)
- `GET /api/keys.php?action=search` - Search keys
- `GET /api/keys.php?action=export` - Export keys

### Admin API
- `GET /api/admin.php?action=stats` - Get system stats
- `POST /api/admin.php?action=create_license` - Create license
- `POST /api/admin.php?action=revoke_license` - Revoke license
- `GET /api/admin.php?action=users` - List all users
- `POST /api/admin.php?action=add_key` - Manually add key

## 🔐 Extension Integration

The extension automatically syncs with panel:
1. User enters license key in extension settings
2. Extension validates license with panel API
3. When keys are captured, auto-sent to panel
4. Keys appear in user dashboard
5. Premium users see all keys globally

---

Made with 🧡 by LineWatchX Project

