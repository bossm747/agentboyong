#!/usr/bin/env python3
"""
Pareng Boyong CLI - Command Line Interface
Filipino AI AGI Super Agent by InnovateHub PH
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def setup_filipino_cli():
    """Setup Filipino CLI environment"""
    os.environ.update({
        'PARENG_BOYONG_MODE': 'true',
        'AGENT_NAME': 'Pareng Boyong',
        'AGENT_COMPANY': 'InnovateHub PH',
        'CLI_MODE': 'true',
        'FILIPINO_AI_ENABLED': 'true'
    })

def print_cli_banner():
    """Print CLI banner"""
    print("🇵🇭 Pareng Boyong CLI - Your Filipino AI Companion")
    print("   Developed by InnovateHub PH")
    print("   Type 'help' for commands, 'exit' to quit")
    print("="*50)

def main():
    """Main CLI function"""
    setup_filipino_cli()
    print_cli_banner()
    
    try:
        # Import and run the original CLI with Filipino branding
        from run_cli import main as original_main
        original_main()
    except ImportError:
        print("Installing dependencies...")
        os.system("pip install -r requirements.txt")
        from run_cli import main as original_main
        original_main()

if __name__ == "__main__":
    main()