<?php
/**
 * KeyScopeX Panel - Landing Page
 * Main entry point for KeyScopeX Panel
 * LineWatchX Project
 */

session_start();

// If logged in, redirect to appropriate dashboard
if (isset($_SESSION['user_id'])) {
    if ($_SESSION['is_admin']) {
        header('Location: ../admin/index.php');
    } else {
        header('Location: ../user/index.php');
    }
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KeyScopeX Panel - DRM Key Collection Platform</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        .hero {
            padding: 80px 20px;
            text-align: center;
        }
        .hero h1 {
            font-size: 3.5rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-hover));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: var(--spacing-lg);
        }
        .hero p {
            font-size: 1.5rem;
            color: var(--text-muted);
            margin-bottom: var(--spacing-xl);
        }
        .cta-buttons {
            display: flex;
            gap: var(--spacing-lg);
            justify-content: center;
            flex-wrap: wrap;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--spacing-xl);
            margin: var(--spacing-xl) 0;
        }
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: var(--spacing-xl);
            margin: var(--spacing-xl) 0;
        }
        .pricing-card {
            background: linear-gradient(135deg, rgba(26, 31, 46, 0.8), rgba(45, 62, 80, 0.4));
            border: 3px solid rgba(255, 107, 53, 0.3);
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            text-align: center;
            transition: var(--transition);
        }
        .pricing-card:hover {
            transform: translateY(-10px);
            border-color: var(--primary);
            box-shadow: var(--shadow-glow);
        }
        .pricing-card.premium {
            border-color: var(--primary);
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.15), rgba(45, 62, 80, 0.6));
        }
        .pricing-price {
            font-size: 3rem;
            font-weight: 700;
            color: var(--primary);
            margin: var(--spacing-lg) 0;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX</h1>
                        <p>by LineWatchX Project</p>
                    </div>
                </div>
                <nav class="nav">
                    <a href="login.php" class="btn btn-secondary">Sign In</a>
                    <a href="register.php" class="btn btn-primary">Get Started FREE</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Hero -->
    <section class="hero">
        <div class="container">
            <h1>DRM Key Collection Platform</h1>
            <p>Extract, Store, and Manage DRM Keys with KeyScopeX</p>
            <div class="cta-buttons">
                <a href="register.php" class="btn btn-primary btn-lg pulse">Start FREE Trial</a>
                <a href="https://github.com/XProject-hub/KeyScopeX" class="btn btn-secondary btn-lg">View on GitHub</a>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section style="padding: 60px 20px; background: rgba(26, 31, 46, 0.3);">
        <div class="container">
            <h2 style="text-align: center; font-size: 2.5rem; color: var(--primary); margin-bottom: var(--spacing-xl);">
                Why KeyScopeX Panel?
            </h2>
            <div class="feature-grid">
                <div class="card">
                    <h3 style="color: var(--primary); margin-bottom: var(--spacing-md);">🔐 Automatic Collection</h3>
                    <p>Extension automatically sends captured keys to your dashboard</p>
                </div>
                <div class="card">
                    <h3 style="color: var(--primary); margin-bottom: var(--spacing-md);">💾 Centralized Storage</h3>
                    <p>All your DRM keys stored securely in one place</p>
                </div>
                <div class="card">
                    <h3 style="color: var(--primary); margin-bottom: var(--spacing-md);">🔍 Easy Search</h3>
                    <p>Search and filter your entire key collection</p>
                </div>
                <div class="card">
                    <h3 style="color: var(--primary); margin-bottom: var(--spacing-md);">📊 Analytics</h3>
                    <p>Track your key collection statistics</p>
                </div>
                <div class="card">
                    <h3 style="color: var(--primary); margin-bottom: var(--spacing-md);">🌐 Global Access (PREMIUM)</h3>
                    <p>Access ALL keys from ALL users worldwide</p>
                </div>
                <div class="card">
                    <h3 style="color: var(--primary); margin-bottom: var(--spacing-md);">💎 Export Anytime</h3>
                    <p>Export your keys as JSON for use anywhere</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing -->
    <section style="padding: 60px 20px;">
        <div class="container">
            <h2 style="text-align: center; font-size: 2.5rem; color: var(--primary); margin-bottom: var(--spacing-xl);">
                Choose Your Plan
            </h2>
            <div class="pricing-grid">
                <!-- FREE Plan -->
                <div class="pricing-card">
                    <h3 style="font-size: 2rem; color: var(--success); margin-bottom: var(--spacing-md);">FREE</h3>
                    <div class="pricing-price">$0<span style="font-size: 1rem; color: var(--text-muted);">/forever</span></div>
                    <ul style="text-align: left; margin: var(--spacing-xl) 0; list-style: none; line-height: 2;">
                        <li>✓ Collect up to 10,000 keys</li>
                        <li>✓ View your own keys</li>
                        <li>✓ Export your keys</li>
                        <li>✓ Extension integration</li>
                        <li>✓ Basic support</li>
                    </ul>
                    <a href="register.php" class="btn btn-success" style="width: 100%;">Get Started FREE</a>
                </div>

                <!-- PREMIUM Plan -->
                <div class="pricing-card premium">
                    <div style="background: var(--primary); color: white; padding: var(--spacing-sm); border-radius: var(--radius-sm); margin-bottom: var(--spacing-md);">
                        ⭐ MOST POPULAR
                    </div>
                    <h3 style="font-size: 2rem; color: var(--primary); margin-bottom: var(--spacing-md);">PREMIUM</h3>
                    <div class="pricing-price">Contact<span style="font-size: 1rem; color: var(--text-muted);">/admin</span></div>
                    <ul style="text-align: left; margin: var(--spacing-xl) 0; list-style: none; line-height: 2;">
                        <li>✓ <strong>ALL FREE features</strong></li>
                        <li>✓ <strong>Unlimited keys</strong></li>
                        <li>✓ <strong>Access ALL keys globally</strong></li>
                        <li>✓ View keys from all users</li>
                        <li>✓ Global search access</li>
                        <li>✓ Priority support</li>
                        <li>✓ API access</li>
                    </ul>
                    <a href="register.php" class="btn btn-primary pulse" style="width: 100%;">Get PREMIUM</a>
                </div>
            </div>
        </div>
    </section>

    <!-- How It Works -->
    <section style="padding: 60px 20px; background: rgba(26, 31, 46, 0.3);">
        <div class="container">
            <h2 style="text-align: center; font-size: 2.5rem; color: var(--primary); margin-bottom: var(--spacing-xl);">
                How It Works
            </h2>
            <div class="grid grid-3">
                <div class="card">
                    <div style="font-size: 3rem; text-align: center; margin-bottom: var(--spacing-md);">1️⃣</div>
                    <h3 style="color: var(--primary); text-align: center; margin-bottom: var(--spacing-md);">Register</h3>
                    <p style="text-align: center;">Create your FREE account and get your license key instantly</p>
                </div>
                <div class="card">
                    <div style="font-size: 3rem; text-align: center; margin-bottom: var(--spacing-md);">2️⃣</div>
                    <h3 style="color: var(--primary); text-align: center; margin-bottom: var(--spacing-md);">Install Extension</h3>
                    <p style="text-align: center;">Add KeyScopeX extension to your browser and activate with your license</p>
                </div>
                <div class="card">
                    <div style="font-size: 3rem; text-align: center; margin-bottom: var(--spacing-md);">3️⃣</div>
                    <h3 style="color: var(--primary); text-align: center; margin-bottom: var(--spacing-md);">Collect Keys</h3>
                    <p style="text-align: center;">Keys automatically appear in your dashboard. Access anytime, anywhere!</p>
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        <p>Made with 🧡 by <span class="footer-brand">LineWatchX Project</span></p>
        <p>KeyScopeX Panel v1.0.0</p>
        <p style="margin-top: var(--spacing-md);">
            <a href="https://github.com/XProject-hub/KeyScopeX" style="color: var(--primary);">GitHub</a> • 
            <a href="https://keyscopex.xproject.live" style="color: var(--primary);">Website</a>
        </p>
    </footer>
</body>
</html>

