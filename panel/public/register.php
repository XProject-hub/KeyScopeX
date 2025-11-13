<?php
/**
 * KeyScopeX Panel - Registration Page
 * LineWatchX Project
 */

session_start();

if (isset($_SESSION['user_id'])) {
    header('Location: ../user/index.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: var(--spacing-lg) 0;
        }
        .register-container {
            width: 100%;
            max-width: 500px;
            padding: var(--spacing-lg);
        }
        .register-card {
            background: linear-gradient(135deg, rgba(26, 31, 46, 0.95), rgba(45, 62, 80, 0.9));
            border: 3px solid var(--primary);
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            box-shadow: var(--shadow-glow);
        }
        .register-logo {
            text-align: center;
            margin-bottom: var(--spacing-xl);
        }
        .register-logo h1 {
            font-size: 2.5rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-hover));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: var(--spacing-sm);
        }
        .license-display {
            background: rgba(255, 107, 53, 0.1);
            border: 2px solid var(--primary);
            border-radius: var(--radius-md);
            padding: var(--spacing-lg);
            margin: var(--spacing-lg) 0;
            text-align: center;
        }
        .license-key {
            font-family: 'Courier New', monospace;
            font-size: 1.25rem;
            color: var(--primary);
            font-weight: 700;
            margin: var(--spacing-md) 0;
        }
    </style>
</head>
<body>
    <div class="register-container">
        <div class="register-card fade-in">
            <div class="register-logo">
                <h1>🔑 KeyScopeX</h1>
                <p class="text-muted">Create your FREE account</p>
            </div>

            <div id="alertContainer"></div>
            <div id="successContainer" style="display: none;">
                <div class="alert alert-success">
                    <strong>✅ Registration Successful!</strong>
                </div>
                <div class="license-display">
                    <p style="margin-bottom: var(--spacing-sm);">Your FREE License Key:</p>
                    <div class="license-key" id="displayLicenseKey"></div>
                    <button onclick="copyLicenseKey()" class="btn btn-primary btn-sm" style="margin-top: var(--spacing-md);">
                        Copy License Key
                    </button>
                    <p class="text-muted" style="margin-top: var(--spacing-md); font-size: 0.875rem;">
                        Save this license key! You'll need it to use the KeyScopeX extension.
                    </p>
                </div>
                <a href="login.php" class="btn btn-primary" style="width: 100%;">
                    Continue to Login
                </a>
            </div>

            <form id="registerForm">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" id="username" name="username" class="form-input" 
                           placeholder="Choose a username" required
                           pattern="[a-zA-Z0-9_]{3,20}"
                           title="3-20 characters, letters, numbers, underscore only">
                    <div class="form-help">3-20 characters, letters/numbers/underscore only</div>
                </div>

                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" id="email" name="email" class="form-input" 
                           placeholder="your@email.com" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="password" name="password" class="form-input" 
                           placeholder="Create a strong password" required
                           minlength="8">
                    <div class="form-help">At least 8 characters with uppercase, lowercase, and number</div>
                </div>

                <div class="form-group">
                    <label class="form-label">Confirm Password</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" class="form-input" 
                           placeholder="Re-enter your password" required>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: var(--spacing-lg);" id="registerBtn">
                    Create FREE Account
                </button>
            </form>

            <div style="text-align: center; margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid rgba(255, 107, 53, 0.2);">
                <p class="text-muted">Already have an account?</p>
                <a href="login.php" class="btn btn-secondary" style="margin-top: var(--spacing-sm);">Sign In</a>
            </div>
        </div>

        <div style="text-align: center; margin-top: var(--spacing-lg);">
            <p class="text-muted" style="font-size: 0.875rem;">
                Developed by <span style="color: var(--primary); font-weight: 600;">X Project</span> | Version 1.0.1
            </p>
        </div>
    </div>

    <script>
        const form = document.getElementById('registerForm');
        const alertContainer = document.getElementById('alertContainer');
        const successContainer = document.getElementById('successContainer');
        const registerBtn = document.getElementById('registerBtn');
        let capturedLicenseKey = '';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validate password match
            if (password !== confirmPassword) {
                showAlert('error', 'Passwords do not match');
                return;
            }

            registerBtn.disabled = true;
            registerBtn.textContent = 'Creating account...';
            alertContainer.innerHTML = '';

            try {
                const response = await fetch('../backend/api/auth.php?action=register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (data.success) {
                    capturedLicenseKey = data.data.license_key;
                    document.getElementById('displayLicenseKey').textContent = capturedLicenseKey;
                    
                    // Hide form, show success
                    form.style.display = 'none';
                    successContainer.style.display = 'block';
                } else {
                    showAlert('error', data.message || 'Registration failed');
                    registerBtn.disabled = false;
                    registerBtn.textContent = 'Create FREE Account';
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('error', 'Connection error. Please try again.');
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create FREE Account';
            }
        });

        function showAlert(type, message) {
            alertContainer.innerHTML = `
                <div class="alert alert-${type}" style="margin-bottom: var(--spacing-lg);">
                    ${message}
                </div>
            `;
        }

        function copyLicenseKey() {
            navigator.clipboard.writeText(capturedLicenseKey).then(() => {
                alert('License key copied to clipboard!');
            });
        }
    </script>
</body>
</html>

