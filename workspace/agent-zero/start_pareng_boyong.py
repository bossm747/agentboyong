#!/usr/bin/env python3
"""
Pareng Boyong - Filipino AI AGI Super Agent
Developed by InnovateHub PH

Startup script for the Filipino AI companion running in secure runtime sandbox
"""

import asyncio
import sys
import os
from pathlib import Path

# Add agent-zero to path
sys.path.insert(0, str(Path(__file__).parent))

def print_filipino_banner():
    """Display Filipino-themed startup banner"""
    banner = """
🇵🇭 ═══════════════════════════════════════════════════════════════ 🇵🇭

    ██████╗  █████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ 
    ██╔══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝ 
    ██████╔╝███████║██████╔╝█████╗  ██╔██╗ ██║██║  ███╗
    ██╔═══╝ ██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██║   ██║
    ██║     ██║  ██║██║  ██║███████╗██║ ╚████║╚██████╔╝
    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ 
                                                        
    ██████╗  ██████╗ ██╗   ██╗ ██████╗ ███╗   ██╗ ██████╗ 
    ██╔══██╗██╔═══██╗╚██╗ ██╔╝██╔═══██╗████╗  ██║██╔════╝ 
    ██████╔╝██║   ██║ ╚████╔╝ ██║   ██║██╔██╗ ██║██║  ███╗
    ██╔══██╗██║   ██║  ╚██╔╝  ██║   ██║██║╚██╗██║██║   ██║
    ██████╔╝╚██████╔╝   ██║   ╚██████╔╝██║ ╚████║╚██████╔╝
    ╚═════╝  ╚═════╝    ╚═╝    ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ 

    🌟 Filipino AI AGI Super Agent by InnovateHub PH 🌟
    
    Kumusta! I'm Pareng Boyong, your AI kaibigan!
    Ready to help with any task - walang hangganan ang kakayahan!

🇵🇭 ═══════════════════════════════════════════════════════════════ 🇵🇭
"""
    print(banner)

def setup_filipino_environment():
    """Setup environment variables for Filipino AI experience"""
    os.environ.update({
        'PARENG_BOYONG_MODE': 'true',
        'AGENT_NAME': 'Pareng Boyong',
        'AGENT_COMPANY': 'InnovateHub PH',
        'AGENT_LANGUAGE': 'filipino',
        'AGENT_CULTURE': 'philippines',
        'AGENT_ZERO_RUNTIME_MODE': 'true',
        'AGENT_ZERO_SANDBOX_URL': 'http://localhost:5000',
        'AGENT_ZERO_DOCKER_DISABLED': 'true',
        'AGENT_ZERO_USE_RUNTIME_SANDBOX': 'true',
        'Filipino_AI_ENABLED': 'true'
    })
    print("🔧 Environment configured for Pareng Boyong...")

def create_filipino_config():
    """Create Filipino-specific configuration"""
    config = {
        "agent": {
            "name": "Pareng Boyong",
            "description": "Filipino AI AGI Super Agent",
            "company": "InnovateHub PH",
            "language": "filipino-english",
            "culture": "philippines"
        },
        "features": {
            "filipino_context": True,
            "bilingual_support": True,
            "cultural_awareness": True,
            "local_business_knowledge": True
        },
        "branding": {
            "colors": {
                "primary": "#1B4F72",  # Philippine blue
                "secondary": "#DC143C",  # Philippine red
                "accent": "#FFD700"     # Philippine gold
            },
            "logo": "innovatehub_logo.png"
        }
    }
    
    import json
    with open('pareng_boyong_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    print("📋 Pareng Boyong configuration created...")

def main():
    """Main startup function for Pareng Boyong"""
    print_filipino_banner()
    
    print("🚀 Starting Pareng Boyong...")
    print("🏠 Initializing secure runtime sandbox...")
    
    # Setup Filipino environment
    setup_filipino_environment()
    create_filipino_config()
    
    print("🎯 Pareng Boyong Runtime Integration Active!")
    print("🌐 Starting Filipino AI Web Interface...")
    print("📍 Access at: http://localhost:8080")
    print()
    print("💬 Ready to chat in Filipino and English!")
    print("🔧 Ready to code, automate, and assist!")
    print("🌟 Walang limitasyon sa loob ng secure environment!")
    print()
    
    try:
        # Import and start the web interface with Filipino branding
        print("🔄 Loading Pareng Boyong AI system...")
        
        # Import the UI with modifications for Filipino branding
        import run_ui
        
        # Modify the app title and branding before starting
        if hasattr(run_ui, 'app'):
            app = run_ui.app
            print("✅ Pareng Boyong loaded successfully!")
            print("🎊 Mabuhay! Your Filipino AI companion is ready!")
            print()
            
            # Start the server
            app.run(host='0.0.0.0', port=8080, debug=False)
        else:
            print("📦 Installing required dependencies...")
            os.system("pip install -r requirements.txt")
            
            # Try again after installing dependencies
            import run_ui
            app = run_ui.app
            print("✅ Pareng Boyong loaded successfully!")
            app.run(host='0.0.0.0', port=8080, debug=False)
            
    except ImportError as e:
        print(f"❌ Error loading Pareng Boyong: {e}")
        print("📦 Installing dependencies...")
        os.system("pip install -r requirements.txt")
        print("🔄 Please try running again after installation completes")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print("🆘 Please check the logs and try again")

if __name__ == "__main__":
    main()