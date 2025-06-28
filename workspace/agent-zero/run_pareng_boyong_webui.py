#!/usr/bin/env python3
"""
Pareng Boyong WebUI Launcher
Launches the complete web interface with runtime sandbox integration
"""

import os
import sys
import subprocess
import time
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def setup_environment():
    """Setup environment for Pareng Boyong with runtime sandbox"""
    os.environ.update({
        'PARENG_BOYONG_MODE': 'true',
        'AGENT_NAME': 'Pareng Boyong',
        'AGENT_COMPANY': 'InnovateHub PH',
        'FLASK_ENV': 'development',
        'RUNTIME_SANDBOX_INTEGRATION': 'true',
        'WEBUI_HOST': '0.0.0.0',
        'WEBUI_PORT': '8080',
        'FILIPINO_AI_ENABLED': 'true'
    })

def print_startup_banner():
    """Print Pareng Boyong startup banner"""
    print("🇵🇭 ═══════════════════════════════════════════════════════════════ 🇵🇭")
    print()
    print("    ██████╗  █████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ")
    print("    ██╔══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝ ")
    print("    ██████╔╝███████║██████╔╝█████╗  ██╔██╗ ██║██║  ███╗")
    print("    ██╔═══╝ ██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██║   ██║")
    print("    ██║     ██║  ██║██║  ██║███████╗██║ ╚████║╚██████╔╝")
    print("    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ ")
    print()
    print("    ██████╗  ██████╗ ██╗   ██╗ ██████╗ ███╗   ██╗ ██████╗ ")
    print("    ██╔══██╗██╔═══██╗╚██╗ ██╔╝██╔═══██╗████╗  ██║██╔════╝ ")
    print("    ██████╔╝██║   ██║ ╚████╔╝ ██║   ██║██╔██╗ ██║██║  ███╗")
    print("    ██╔══██╗██║   ██║  ╚██╔╝  ██║   ██║██║╚██╗██║██║   ██║")
    print("    ██████╔╝╚██████╔╝   ██║   ╚██████╔╝██║ ╚████║╚██████╔╝")
    print("    ╚═════╝  ╚═════╝    ╚═╝    ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ")
    print()
    print("    🌟 Filipino AI AGI Super Agent by InnovateHub PH 🌟")
    print()
    print("    Kumusta! I'm Pareng Boyong, your AI kaibigan!")
    print("    Ready to help with any task - walang hangganan ang kakayahan!")
    print()
    print("🇵🇭 ═══════════════════════════════════════════════════════════════ 🇵🇭")
    print()

def main():
    """Main function to start Pareng Boyong WebUI"""
    setup_environment()
    print_startup_banner()
    
    print("🚀 Starting Pareng Boyong WebUI...")
    print("🏠 Runtime Sandbox Integration: ACTIVE")
    print("🌐 Web Interface: http://localhost:8080")
    print("📍 Access via Runtime Sandbox: /pareng-boyong/")
    print()
    
    try:
        # Import and start the web UI
        from run_ui import main as start_webui
        start_webui()
        
    except ImportError as e:
        print(f"📦 Installing dependencies: {e}")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        
        # Try again after installation
        try:
            from run_ui import main as start_webui
            start_webui()
        except Exception as e:
            print(f"❌ Error starting WebUI: {e}")
            print("🔄 Starting basic web server instead...")
            
            # Fallback: Start basic HTTP server for webui
            os.chdir('webui')
            subprocess.run([sys.executable, "-m", "http.server", "8080", "--bind", "0.0.0.0"])
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("🔄 Starting fallback web server...")
        
        # Fallback: Start basic HTTP server for webui
        os.chdir('webui')
        subprocess.run([sys.executable, "-m", "http.server", "8080", "--bind", "0.0.0.0"])

if __name__ == "__main__":
    main()