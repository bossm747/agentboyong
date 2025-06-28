"""
Runtime Sandbox Shell Interface - Replaces SSH/Local shell with our runtime sandbox
"""

import requests
import time
import json
import asyncio
from typing import Dict, Any, Optional
from python.helpers.print_style import PrintStyle
from python.helpers.log import Log

class RuntimeInteractiveSession:
    """Interactive shell session using our runtime sandbox instead of SSH/local shell"""
    
    def __init__(self, logger: Log = None, sandbox_url: str = "http://localhost:5000"):
        self.logger = logger
        self.sandbox_url = sandbox_url
        self.session_id = None
        self.connected = False
        self.command_history = []
        
    async def connect(self):
        """Connect to the runtime sandbox"""
        try:
            # Create a new session
            response = requests.post(f"{self.sandbox_url}/api/sessions", json={
                "status": "active",
                "userId": 1  # Default user for agent-zero
            })
            
            if response.status_code == 200:
                session_data = response.json()
                self.session_id = session_data["id"]
                self.connected = True
                
                if self.logger:
                    self.logger.log(type="info", content=f"Connected to runtime sandbox: {self.session_id}")
                
                return True
            else:
                raise Exception(f"Failed to create session: {response.status_code}")
                
        except Exception as e:
            if self.logger:
                self.logger.log(type="error", content=f"Failed to connect to runtime sandbox: {e}")
            raise
    
    def send_command(self, command: str):
        """Send a command to the runtime sandbox"""
        if not self.connected or not self.session_id:
            raise Exception("Not connected to runtime sandbox")
        
        try:
            self.command_history.append({
                "command": command,
                "timestamp": time.time()
            })
            
            # Execute command via our API
            response = requests.post(f"{self.sandbox_url}/api/execute/{self.session_id}", 
                                   json={"command": command})
            
            if response.status_code != 200:
                raise Exception(f"Command execution failed: {response.status_code}")
                
            self.last_response = response.json()
            
        except Exception as e:
            if self.logger:
                self.logger.log(type="error", content=f"Failed to send command: {e}")
            raise
    
    def read_output(self) -> str:
        """Read the output from the last command"""
        if hasattr(self, 'last_response') and self.last_response:
            stdout = self.last_response.get('stdout', '')
            stderr = self.last_response.get('stderr', '')
            
            # Combine stdout and stderr like a real terminal
            output = ""
            if stdout:
                output += stdout
            if stderr:
                if output:
                    output += "\n"
                output += stderr
                
            return output
        return ""
    
    def read_any_output(self) -> str:
        """Read any available output (same as read_output for our implementation)"""
        return self.read_output()
    
    def close(self):
        """Close the session"""
        if self.session_id:
            try:
                requests.post(f"{self.sandbox_url}/api/sessions/{self.session_id}/end")
                if self.logger:
                    self.logger.log(type="info", content=f"Closed runtime sandbox session: {self.session_id}")
            except Exception as e:
                if self.logger:
                    self.logger.log(type="error", content=f"Failed to close session: {e}")
        
        self.connected = False
        self.session_id = None
    
    def is_connected(self) -> bool:
        """Check if connected to the runtime sandbox"""
        return self.connected and self.session_id is not None
    
    def get_session_id(self) -> Optional[str]:
        """Get the current session ID"""
        return self.session_id
    
    def execute_python_code(self, code: str) -> Dict[str, Any]:
        """Execute Python code directly"""
        if not self.connected:
            raise Exception("Not connected to runtime sandbox")
        
        try:
            # Create a temporary Python file
            temp_file = f"/tmp/agent_zero_py_{int(time.time())}.py"
            
            # Write the code to file
            file_response = requests.post(f"{self.sandbox_url}/api/files/{self.session_id}/content",
                                        json={
                                            "path": temp_file,
                                            "content": code,
                                            "mimeType": "text/x-python"
                                        })
            
            if file_response.status_code != 200:
                raise Exception(f"Failed to write Python file: {file_response.status_code}")
            
            # Execute the Python file
            self.send_command(f"python {temp_file}")
            result = self.read_output()
            
            # Clean up
            requests.delete(f"{self.sandbox_url}/api/files/{self.session_id}",
                          params={"path": temp_file})
            
            return {
                "stdout": result,
                "stderr": "",
                "exitCode": 0 if result else 1
            }
            
        except Exception as e:
            return {
                "stdout": "",
                "stderr": str(e),
                "exitCode": 1
            }
    
    def execute_nodejs_code(self, code: str) -> Dict[str, Any]:
        """Execute Node.js code directly"""
        if not self.connected:
            raise Exception("Not connected to runtime sandbox")
        
        try:
            # Create a temporary JavaScript file
            temp_file = f"/tmp/agent_zero_js_{int(time.time())}.js"
            
            # Write the code to file
            file_response = requests.post(f"{self.sandbox_url}/api/files/{self.session_id}/content",
                                        json={
                                            "path": temp_file,
                                            "content": code,
                                            "mimeType": "text/javascript"
                                        })
            
            if file_response.status_code != 200:
                raise Exception(f"Failed to write JavaScript file: {file_response.status_code}")
            
            # Execute the JavaScript file
            self.send_command(f"node {temp_file}")
            result = self.read_output()
            
            # Clean up
            requests.delete(f"{self.sandbox_url}/api/files/{self.session_id}",
                          params={"path": temp_file})
            
            return {
                "stdout": result,
                "stderr": "",
                "exitCode": 0 if result else 1
            }
            
        except Exception as e:
            return {
                "stdout": "",
                "stderr": str(e),
                "exitCode": 1
            }
    
    def get_working_directory(self) -> str:
        """Get current working directory"""
        try:
            self.send_command("pwd")
            return self.read_output().strip()
        except:
            return "/tmp"
    
    def change_directory(self, path: str):
        """Change working directory"""
        self.send_command(f"cd {path}")
    
    def list_files(self, path: str = ".") -> str:
        """List files in directory"""
        self.send_command(f"ls -la {path}")
        return self.read_output()
    
    def read_file_content(self, file_path: str) -> str:
        """Read file content using our file API"""
        if not self.session_id:
            return ""
        
        try:
            response = requests.get(f"{self.sandbox_url}/api/files/{self.session_id}/content",
                                  params={"path": file_path})
            
            if response.status_code == 200:
                return response.json().get("content", "")
            else:
                return ""
        except:
            return ""
    
    def write_file_content(self, file_path: str, content: str) -> bool:
        """Write file content using our file API"""
        if not self.session_id:
            return False
        
        try:
            response = requests.post(f"{self.sandbox_url}/api/files/{self.session_id}/content",
                                   json={
                                       "path": file_path,
                                       "content": content,
                                       "mimeType": "text/plain"
                                   })
            
            return response.status_code == 200
        except:
            return False