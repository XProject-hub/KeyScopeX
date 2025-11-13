#!/bin/bash
##############################################################################
# KeyScopeX Panel - Complete Ubuntu 22.04 Installation Script
# Installs MySQL, PHP, and deploys the panel
# LineWatchX Project
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
ORANGE='\033[0;33m'
NC='\033[0m'

echo -e "${ORANGE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              KeyScopeX Panel Installer                        ║"
echo "║              Complete SaaS Platform Setup                     ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

##############################################################################
# Step 1: Update System
##############################################################################
echo -e "${GREEN}▶ Step 1/8: Updating system packages${NC}"
apt-get update
apt-get upgrade -y
echo -e "${GREEN}✓ System updated${NC}\n"

##############################################################################
# Step 2: Install MySQL/MariaDB
##############################################################################
echo -e "${GREEN}▶ Step 2/8: Installing MySQL Server${NC}"
apt-get install -y mariadb-server mariadb-client
systemctl start mariadb
systemctl enable mariadb
echo -e "${GREEN}✓ MySQL installed${NC}\n"

##############################################################################
# Step 3: Install PHP 8.1
##############################################################################
echo -e "${GREEN}▶ Step 3/8: Installing PHP 8.1 and extensions${NC}"
apt-get install -y php8.1 php8.1-fpm php8.1-mysql php8.1-cli php8.1-common \
    php8.1-curl php8.1-mbstring php8.1-xml php8.1-zip
systemctl start php8.1-fpm
systemctl enable php8.1-fpm
echo -e "${GREEN}✓ PHP 8.1 installed${NC}\n"

##############################################################################
# Step 4: Install Nginx (if not present)
##############################################################################
echo -e "${GREEN}▶ Step 4/8: Checking Nginx installation${NC}"
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo -e "${GREEN}✓ Nginx installed${NC}"
else
    echo -e "${GREEN}✓ Nginx already installed${NC}"
fi
echo ""

##############################################################################
# Step 5: Setup Database
##############################################################################
echo -e "${GREEN}▶ Step 5/8: Setting up database${NC}"

# Check if we're in the right directory
if [ ! -f "panel/database/schema.sql" ]; then
    echo -e "${RED}❌ Error: schema.sql not found${NC}"
    echo -e "${RED}Make sure you're running this from KeyScopeX directory${NC}"
    exit 1
fi

mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS keyscopex_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'keyscopex_user'@'localhost' IDENTIFIED BY 'KeyScope#2024!Secure';
GRANT ALL PRIVILEGES ON keyscopex_panel.* TO 'keyscopex_user'@'localhost';
FLUSH PRIVILEGES;
EOF

mysql -u root keyscopex_panel < panel/database/schema.sql

echo -e "${GREEN}✓ Database created${NC}"
echo -e "${YELLOW}Database: keyscopex_panel${NC}"
echo -e "${YELLOW}User: keyscopex_user${NC}"
echo -e "${YELLOW}Password: KeyScope#2024!Secure${NC}"
echo -e "${YELLOW}⚠️  CHANGE PASSWORD IN PRODUCTION!${NC}\n"

##############################################################################
# Step 6: Deploy Panel Files
##############################################################################
echo -e "${GREEN}▶ Step 6/8: Deploying panel files${NC}"

# Copy panel to web directory
cp -r panel /var/www/keyscopex/

# Update database config
cat > /var/www/keyscopex/panel/backend/config/database.php <<'DBCONFIG'
<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'keyscopex_user');
define('DB_PASS', 'KeyScope#2024!Secure');
define('DB_NAME', 'keyscopex_panel');
define('DB_CHARSET', 'utf8mb4');

class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            die(json_encode(['success' => false, 'message' => 'Database connection failed']));
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    private function __clone() {}
    
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

function getDB() {
    return Database::getInstance()->getConnection();
}
?>
DBCONFIG

echo -e "${GREEN}✓ Panel files deployed${NC}\n"

##############################################################################
# Step 7: Set Permissions
##############################################################################
echo -e "${GREEN}▶ Step 7/8: Setting permissions${NC}"
chmod -R 755 /var/www/keyscopex/panel
chown -R www-data:www-data /var/www/keyscopex/panel
mkdir -p /var/www/keyscopex/panel/logs
chmod 777 /var/www/keyscopex/panel/logs
echo -e "${GREEN}✓ Permissions set${NC}\n"

##############################################################################
# Step 8: Configure Nginx
##############################################################################
echo -e "${GREEN}▶ Step 8/8: Configuring Nginx${NC}"

cat > /etc/nginx/sites-available/keyscopex <<'NGINXCONF'
server {
    listen 80;
    server_name keyscopex.xproject.live 23.95.75.174;
    
    root /var/www/keyscopex;
    index index.html index.php;
    
    access_log /var/log/nginx/keyscopex-access.log;
    error_log /var/log/nginx/keyscopex-error.log;
    
    # Main site
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Panel location
    location /panel {
        index index.php;
        try_files $uri $uri/ /panel/index.php?$query_string;
    }
    
    # PHP processing
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXCONF

# Enable site
ln -sf /etc/nginx/sites-available/keyscopex /etc/nginx/sites-enabled/

# Test and restart Nginx
nginx -t
systemctl restart nginx
systemctl restart php8.1-fpm

echo -e "${GREEN}✓ Nginx configured${NC}\n"

##############################################################################
# Final Summary
##############################################################################
echo -e "${ORANGE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              🎉 Installation Complete! 🎉                     ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}✅ KeyScopeX Panel deployed successfully!${NC}\n"

echo -e "${YELLOW}📋 Access Information:${NC}"
echo -e "   🌐 Panel URL: https://keyscopex.xproject.live/panel/"
echo -e "   👤 Admin Login: https://keyscopex.xproject.live/panel/admin/"
echo -e "   📝 Register: https://keyscopex.xproject.live/panel/public/register.php\n"

echo -e "${YELLOW}🔑 Default Admin Credentials:${NC}"
echo -e "   Username: admin"
echo -e "   Password: admin123"
echo -e "   ${RED}⚠️  CHANGE PASSWORD IMMEDIATELY!${NC}\n"

echo -e "${YELLOW}🗄️ Database Credentials:${NC}"
echo -e "   Database: keyscopex_panel"
echo -e "   User: keyscopex_user"
echo -e "   Password: KeyScope#2024!Secure"
echo -e "   ${RED}⚠️  CHANGE IN PRODUCTION!${NC}\n"

echo -e "${YELLOW}📦 Next Steps:${NC}"
echo -e "   1. Test admin login"
echo -e "   2. Change admin password"
echo -e "   3. Update database password"
echo -e "   4. Test user registration"
echo -e "   5. Install extension and connect!\n"

echo -e "${ORANGE}🧡 Made with love by LineWatchX Project${NC}\n"

# Test API
echo -e "${GREEN}🧪 Testing API...${NC}"
curl -s http://localhost/panel/backend/api/auth.php 2>&1 | head -n 1

exit 0

