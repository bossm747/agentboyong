#!/usr/bin/env python3
"""
Agent Zero Runtime Startup Script
Launches Agent Zero as the main UI in our runtime sandbox
"""

import asyncio
import sys
import os
from pathlib import Path

# Add agent-zero to path
sys.path.insert(0, str(Path(__file__).parent))

def setup_runtime_environment():
    """Setup environment variables for runtime integration"""
    os.environ.update({
        'AGENT_ZERO_RUNTIME_MODE': 'true',
        'AGENT_ZERO_SANDBOX_URL': 'http://localhost:5000',
        'AGENT_ZERO_DOCKER_DISABLED': 'true',
        'AGENT_ZERO_USE_RUNTIME_SANDBOX': 'true'
    })
    print("🔧 Environment configured for runtime integration")

def main():
    """Main startup function"""
    print("🌟 Starting Agent Zero as Runtime Main UI...")
    
    # Setup environment
    setup_runtime_environment()
    
    print("🎯 Agent Zero Runtime Integration Active!")
    print("🌐 Starting Agent Zero Web UI on http://localhost:8080...")
    
    try:
        # Import and start Agent Zero's web interface
        from run_ui import app
        app.run(host='0.0.0.0', port=8080, debug=False)
    except ImportError as e:
        print(f"Error importing Agent Zero UI: {e}")
        print("Installing required dependencies...")
        os.system("pip install -r requirements.txt")
        # Try again
        from run_ui import app
        app.run(host='0.0.0.0', port=8080, debug=False)

if __name__ == "__main__":
    main()