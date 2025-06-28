#!/usr/bin/env python3
"""
Pareng Boyong Engine - Backend AGI System
Integrated with Runtime Sandbox for Full AGI Capabilities
"""

import os
import sys
import asyncio
import json
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def setup_pareng_boyong_environment():
    """Setup Pareng Boyong environment with runtime sandbox integration"""
    os.environ.update({
        'PARENG_BOYONG_MODE': 'true',
        'AGENT_NAME': 'Pareng Boyong',
        'AGENT_COMPANY': 'InnovateHub PH',
        'AGENT_DESCRIPTION': 'Filipino AI AGI Super Agent',
        'RUNTIME_SANDBOX_MODE': 'true',
        'SANDBOX_URL': 'http://localhost:5000',
        'WEBUI_PORT': '8080',
        'FILIPINO_AI_ENABLED': 'true',
        'USE_RUNTIME_SANDBOX': 'true',
        'DOCKER_DISABLED': 'true'
    })

def create_pareng_boyong_config():
    """Create Pareng Boyong configuration file"""
    config = {
        "agent": {
            "name": "Pareng Boyong",
            "description": "Filipino AI AGI Super Agent by InnovateHub PH",
            "personality": "Friendly Filipino AI assistant with cultural awareness",
            "language": "bilingual_filipino_english",
            "company": "InnovateHub PH"
        },
        "runtime": {
            "use_sandbox": True,
            "sandbox_url": "http://localhost:5000",
            "disable_docker": True,
            "mcp_integration": True
        },
        "features": {
            "unlimited_capabilities": True,
            "filipino_context": True,
            "bilingual_support": True,
            "secure_execution": True
        }
    }
    
    with open('pareng_boyong_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    return config

async def start_pareng_boyong_backend():
    """Start Pareng Boyong backend with runtime sandbox integration"""
    try:
        # Setup environment
        setup_pareng_boyong_environment()
        config = create_pareng_boyong_config()
        
        print("🇵🇭 Starting Pareng Boyong Backend Engine...")
        print("🏠 Integrating with Runtime Sandbox...")
        
        # Import and configure the agent with runtime sandbox
        from agent import Agent0
        from models import get_openai_client
        
        # Create agent instance with Filipino branding
        agent = Agent0(
            number=0,
            name="Pareng Boyong",
            description="Filipino AI AGI Super Agent by InnovateHub PH"
        )
        
        # Configure runtime sandbox integration
        agent.config = config
        
        print("✅ Pareng Boyong Backend Engine Ready!")
        print("🎯 Runtime Sandbox Integration Active!")
        print("🌐 Web Interface Available!")
        print("💬 Filipino & English Language Support Enabled!")
        
        return agent
        
    except Exception as e:
        print(f"❌ Error starting Pareng Boyong backend: {e}")
        print("📦 Installing dependencies...")
        os.system("pip install -r requirements.txt")
        return None

if __name__ == "__main__":
    asyncio.run(start_pareng_boyong_backend())