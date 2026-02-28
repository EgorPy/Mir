import { BACKEND_URL } from '/static/config.js'

async function checkAuth() {
    try {
        const url = `${BACKEND_URL}/auth/me`;

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.log('User is not logged in');
                window.location.href = '/login';
            } else {
                console.error('Auth check failed:', response.status);
            }
            return false;
        }

        const data = await response.json();
        console.log('User is logged in');
        return true;
    } catch (error) {
        console.error('Error checking authentication:', error);
        console.log('Auth check failed, user is not logged in');
        window.location.href = '/login';
        return false;
    }
}

async function isAuthenticated() {
    try {
        const url = `${BACKEND_URL}/auth/me`;

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        return response.ok;
    } catch (error) {
        console.error('Error checking authentication:', error);
        return false;
    }
}

async function getCurrentUser() {
    try {
        const url = `${BACKEND_URL}/auth/me`;

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

async function logout() {
    try {
        const url = `${BACKEND_URL}/auth/logout/`;

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            window.location.href = '/login';
        } else {
            console.error('Logout failed:', response.status);
        }
    } catch (error) {
        console.error('Error during logout:', error);
    }
}

async function authFetch(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;

    const response = await fetch(fullUrl, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        }
    });

    if (response.status === 401) {
        console.log('Session expired, redirecting to login');
        window.location.href = '/login';
        return null;
    }

    return response;
}

document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const publicPaths = ['/login', '/register'];

    const basePath = window.BASE_PATH || '';
    const fullPublicPaths = publicPaths.map(path => basePath + path);

    if (!fullPublicPaths.includes(currentPath) && !currentPath.includes('/public/')) {
        setTimeout(checkAuth, 100);
    }
});

window.auth = {
    check: checkAuth,
    isAuthenticated: isAuthenticated,
    getCurrentUser: getCurrentUser,
    logout: logout,
    fetch: authFetch
};
