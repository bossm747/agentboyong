/**
 * Pareng Boyong API Integration
 * Connects webui to runtime sandbox backend
 */

// Configuration for Pareng Boyong
const PARENG_BOYONG_CONFIG = {
    backendUrl: '', // Use relative URLs to work with our Express server
    apiPrefix: '/api',
    sandboxIntegration: true,
    name: 'Pareng Boyong',
    company: 'InnovateHub PH',
    description: 'Filipino AI AGI Super Agent'
};

console.log('🇵🇭 Pareng Boyong API Integration Loaded!');
console.log('Runtime Sandbox Backend:', window.location.origin);

// Complete API bridge for Agent Zero webui to work with our runtime sandbox
window.callJsonApi = async function(endpoint, data = {}) {
    try {
        console.log('API Call:', endpoint, data);
        
        // Map Agent Zero endpoints to our runtime sandbox endpoints
        let url = '';
        let method = 'GET';
        let body = null;
        
        switch (endpoint) {
            case '/api/tasks':
                url = `${PARENG_BOYONG_CONFIG.backendUrl}/api/tasks`;
                break;
            case '/api/check_tunnel':
                url = `${PARENG_BOYONG_CONFIG.backendUrl}/api/check_tunnel`;
                break;
            case '/api/chats':
                url = `${PARENG_BOYONG_CONFIG.backendUrl}/api/chats`;
                break;
            default:
                if (endpoint.startsWith('/api/chat/')) {
                    const chatId = endpoint.split('/api/chat/')[1];
                    url = `${PARENG_BOYONG_CONFIG.backendUrl}/api/chat/${chatId}`;
                } else if (endpoint === '/api/message') {
                    url = `${PARENG_BOYONG_CONFIG.backendUrl}/api/message`;
                    method = 'POST';
                    body = JSON.stringify(data);
                } else {
                    // Fallback for unknown endpoints
                    url = `${PARENG_BOYONG_CONFIG.backendUrl}/api/pareng-boyong/chat`;
                    method = 'POST';
                    body = JSON.stringify({
                        message: `API call: ${endpoint}`,
                        data: data,
                        sessionId: 'pareng-boyong-session'
                    });
                }
                break;
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('API Response:', result);
        return result;
        
    } catch (error) {
        console.warn(`API error for ${endpoint}:`, error);
        // Return meaningful error responses based on endpoint
        switch (endpoint) {
            case '/api/tasks':
                return [];
            case '/api/check_tunnel':
                return { status: 'runtime_sandbox', message: 'Using runtime sandbox' };
            case '/api/chats':
                return [{ id: 'pareng-boyong-default', name: 'Pareng Boyong Chat' }];
            default:
                return { 
                    error: true,
                    message: `API ${endpoint} temporarily unavailable`,
                    agent: 'Pareng Boyong',
                    runtime_sandbox: true
                };
        }
    }
};

// Override the CSRF token function to work with our backend
window.getCsrfToken = async function() {
    // Our runtime sandbox doesn't use CSRF tokens
    return 'pareng-boyong-token';
};

// Initialize Pareng Boyong branding
function initializeParengBoyong() {
    // Update page title
    document.title = '🇵🇭 Pareng Boyong - Filipino AI AGI by InnovateHub PH';
    
    // Add Filipino styling
    const style = document.createElement('style');
    style.textContent = `
        body {
            --pareng-boyong-yellow: #FFD700;
            --pareng-boyong-blue: #0038A8;
            --pareng-boyong-red: #CE1126;
        }
        
        .pareng-boyong-header {
            background: linear-gradient(45deg, var(--pareng-boyong-blue), var(--pareng-boyong-red));
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
        }
        
        .filipino-flag {
            display: inline-block;
            margin-right: 8px;
        }
    `;
    document.head.appendChild(style);
    
    // Add header banner if it doesn't exist
    if (!document.querySelector('.pareng-boyong-header')) {
        const header = document.createElement('div');
        header.className = 'pareng-boyong-header';
        header.innerHTML = `
            <span class="filipino-flag">🇵🇭</span>
            Pareng Boyong - Filipino AI AGI Super Agent by InnovateHub PH
            <span class="filipino-flag">🇵🇭</span>
        `;
        document.body.insertBefore(header, document.body.firstChild);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeParengBoyong);
} else {
    initializeParengBoyong();
}

console.log('🇵🇭 Pareng Boyong API Integration Loaded!');
console.log('Runtime Sandbox Backend:', PARENG_BOYONG_CONFIG.backendUrl);