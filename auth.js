// DOM Elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginFormElement = document.getElementById('login-form-element');
const signupFormElement = document.getElementById('signup-form-element');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const loadingOverlay = document.getElementById('loading-overlay');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

// Toggle between login and signup forms
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
    clearErrors();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
    clearErrors();
});

// Clear error messages
function clearErrors() {
    loginError.style.display = 'none';
    signupError.style.display = 'none';
    loginError.textContent = '';
    signupError.textContent = '';
}

// Show error message
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

// Show loading overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Handle Login
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showError(loginError, 'Please fill in all fields');
        return;
    }

    showLoading();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (result.success) {
            // Redirect to main app
            window.location.href = '/index.html';
        } else {
            hideLoading();
            showError(loginError, result.error || 'Login failed. Please try again.');
        }
    } catch (error) {
        hideLoading();
        showError(loginError, 'Network error. Please check your connection and try again.');
        console.error('Login error:', error);
    }
});

// Handle Signup
signupFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    // Client-side validation
    if (!username || !email || !password || !confirmPassword) {
        showError(signupError, 'Please fill in all fields');
        return;
    }

    if (username.length < 3) {
        showError(signupError, 'Username must be at least 3 characters');
        return;
    }

    if (!email.includes('@')) {
        showError(signupError, 'Please enter a valid email address');
        return;
    }

    if (password.length < 6) {
        showError(signupError, 'Password must be at least 6 characters');
        return;
    }

    if (password !== confirmPassword) {
        showError(signupError, 'Passwords do not match');
        return;
    }

    showLoading();

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const result = await response.json();

        if (result.success) {
            // Redirect to main app
            window.location.href = '/index.html';
        } else {
            hideLoading();
            showError(signupError, result.error || 'Signup failed. Please try again.');
        }
    } catch (error) {
        hideLoading();
        showError(signupError, 'Network error. Please check your connection and try again.');
        console.error('Signup error:', error);
    }
});

// Check if user is already logged in
async function checkSession() {
    try {
        const response = await fetch('/api/check-session');
        const result = await response.json();

        if (result.logged_in) {
            window.location.href = '/index.html';
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// Check session on page load
checkSession();