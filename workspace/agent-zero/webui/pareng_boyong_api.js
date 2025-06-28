/**
 * Pareng Boyong API Integration
 * Connects webui to runtime sandbox backend
 */

// Configuration for Pareng Boyong
const PARENG_BOYONG_CONFIG = {
    backendUrl: window.location.origin, // Use same origin as our runtime sandbox
    apiPrefix: '/api',
    sandboxIntegration: true,
    name: 'Pareng Boyong',
    company: 'InnovateHub PH',
    description: 'Filipino AI AGI Super Agent'
};

// Override the default API calls to use our runtime sandbox
window.callParengBoyongApi = async function(endpoint, data) {
    try {
        const response = await fetch(`${PARENG_BOYONG_CONFIG.backendUrl}${PARENG_BOYONG_CONFIG.apiPrefix}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            console.warn(`API call failed: ${endpoint}`, response.status);
            return { error: `API unavailable: ${response.status}` };
        }

        return await response.json();
    } catch (error) {
        console.warn(`API error for ${endpoint}:`, error);
        return { error: error.message };
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