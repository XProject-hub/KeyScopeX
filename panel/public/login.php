<?php
/**
 * KeyScopeX Panel - Login Page
 * LineWatchX Project
 */

session_start();

// If already logged in, redirect
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
    <title>Login - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .login-container {
            width: 100%;
            max-width: 450px;
            padding: var(--spacing-lg);
        }
        .login-card {
            background: linear-gradient(135deg, rgba(26, 31, 46, 0.95), rgba(45, 62, 80, 0.9));
            border: 3px solid var(--primary);
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            box-shadow: var(--shadow-glow);
        }
        .login-logo {
            text-align: center;
            margin-bottom: var(--spacing-xl);
        }
        .login-logo h1 {
            font-size: 2.5rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-hover));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: var(--spacing-sm);
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-card fade-in">
            <div class="login-logo">
                <h1>🔑 KeyScopeX</h1>
                <p class="text-muted">Sign in to your account</p>
            </div>

            <div id="alertContainer"></div>

            <form id="loginForm">
                <div class="form-group">
                    <label class="form-label">Username or Email</label>
                    <input type="text" id="email" name="email" class="form-input" placeholder="admin or your@email.com" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="password" name="password" class="form-input" placeholder="Enter your password" required>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: var(--spacing-lg);" id="loginBtn">
                    Sign In
                </button>
            </form>

            <div style="text-align: center; margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid rgba(255, 107, 53, 0.2);">
                <p class="text-muted">Don't have an account?</p>
                <a href="register.php" class="btn btn-secondary" style="margin-top: var(--spacing-sm);">Create Account</a>
            </div>
        </div>

        <div style="text-align: center; margin-top: var(--spacing-lg);">
            <p class="text-muted" style="font-size: 0.875rem;">
                Developed by <span style="color: var(--primary); font-weight: 600;">X Project</span> | Version 1.0.1
            </p>
        </div>
    </div>

    <script>
        const form = document.getElementById('loginForm');
        const alertContainer = document.getElementById('alertContainer');
        const loginBtn = document.getElementById('loginBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';
            alertContainer.innerHTML = '';

            try {
                const response = await fetch('../backend/api/auth.php?action=login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    showAlert('success', 'Login successful! Redirecting...');
                    
                    setTimeout(() => {
                        if (data.data.is_admin) {
                            window.location.href = '../admin/index.php';
                        } else {
                            window.location.href = '../user/index.php';
                        }
                    }, 1000);
                } else {
                    showAlert('error', data.message || 'Login failed');
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign In';
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('error', 'Connection error. Please try again.');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });

        function showAlert(type, message) {
            alertContainer.innerHTML = `
                <div class="alert alert-${type}" style="margin-bottom: var(--spacing-lg);">
                    ${message}
                </div>
            `;
        }
    </script>
</body>
</html>

