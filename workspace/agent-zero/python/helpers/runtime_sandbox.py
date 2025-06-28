"""
Runtime Sandbox Adapter - Replaces Docker functionality with our MCP Runtime Sandbox
This provides the same interface as DockerContainerManager but uses our runtime environment
"""

import time
import requests
import json
from typing import Optional, Dict, Any
from python.helpers.errors import format_error
from python.helpers.print_style import PrintStyle
from python.helpers.log import Log

class RuntimeSandboxManager:
    """Replacement for DockerContainerManager that uses our MCP Runtime Sandbox"""
    
    def __init__(self, image: str, name: str, ports: Optional[dict[str, int]] = None, 
                 volumes: Optional[dict[str, dict[str, str]]] = None, logger: Log|None=None,
                 sandbox_url: str = "http://localhost:5000"):
        self.logger = logger
        self.image = image  # Keep for compatibility but not used
        self.name = name
        self.ports = ports  # Keep for compatibility but not used
        self.volumes = volumes  # Keep for compatibility but not used
        self.sandbox_url = sandbox_url
        self.session_id = None
        self.init_sandbox()
    
    def init_sandbox(self):
        """Initialize connection to our runtime sandbox"""
        self.client = None
        while not self.client:
            try:
                # Create a new session in our runtime sandbox
                response = requests.post(f"{self.sandbox_url}/api/sessions", json={
                    "status": "active",
                    "userId": 1  # Default user for agent-zero
                })
                
                if response.status_code == 200:
                    session_data = response.json()
                    self.session_id = session_data["id"]
                    self.client = True
                    PrintStyle.standard(f"Connected to Runtime Sandbox - Session: {self.session_id}")
                    if self.logger: 
                        self.logger.log(type="info", content=f"Connected to Runtime Sandbox - Session: {self.session_id}")
                else:
                    raise Exception(f"Failed to create sandbox session: {response.status_code}")
                    
            except Exception as e:
                err = format_error(e)
                if ("ConnectionRefusedError" in err or "Connection refused" in err):
                    PrintStyle.hint("Connection to Runtime Sandbox failed. Is the sandbox server running on port 5000?")
                    if self.logger:
                        self.logger.log(type="hint", content="Connection to Runtime Sandbox failed. Is the sandbox server running on port 5000?")
                    PrintStyle.error(err)
                    if self.logger:
                        self.logger.log(type="error", content=err)
                    time.sleep(5)
                else: 
                    raise
        return self.client
    
    def cleanup_container(self) -> None:
        """End the sandbox session"""
        if self.session_id:
            try:
                # End the session in our runtime sandbox
                response = requests.post(f"{self.sandbox_url}/api/sessions/{self.session_id}/end")
                if response.status_code == 200:
                    PrintStyle.standard(f"Ended sandbox session: {self.session_id}")
                    if self.logger: 
                        self.logger.log(type="info", content=f"Ended sandbox session: {self.session_id}")
                else:
                    PrintStyle.error(f"Failed to end sandbox session: {response.status_code}")
                    if self.logger: 
                        self.logger.log(type="error", content=f"Failed to end sandbox session: {response.status_code}")
            except Exception as e:
                PrintStyle.error(f"Failed to end sandbox session: {e}")
                if self.logger: 
                    self.logger.log(type="error", content=f"Failed to end sandbox session: {e}")
    
    def execute_command(self, command: str, timeout: int = 30) -> Dict[str, Any]:
        """Execute a command in the runtime sandbox"""
        if not self.session_id:
            raise Exception("No active sandbox session")
        
        try:
            response = requests.post(f"{self.sandbox_url}/api/execute/{self.session_id}", 
                                   json={"command": command}, 
                                   timeout=timeout)
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Command execution failed: {response.status_code}")
                
        except Exception as e:
            raise Exception(f"Failed to execute command: {e}")
    
    def execute_python_code(self, code: str, timeout: int = 30) -> Dict[str, Any]:
        """Execute Python code in the runtime sandbox"""
        # Write code to a temporary file and execute it
        import tempfile
        import os
        
        try:
            # Create temporary Python file
            temp_file = f"/tmp/agent_zero_{int(time.time())}.py"
            
            # Write code to file via our file API
            response = requests.post(f"{self.sandbox_url}/api/files/{self.session_id}/content",
                                   json={
                                       "path": temp_file,
                                       "content": code,
                                       "mimeType": "text/x-python"
                                   })
            
            if response.status_code != 200:
                raise Exception(f"Failed to write Python file: {response.status_code}")
            
            # Execute the Python file
            result = self.execute_command(f"python {temp_file}", timeout)
            
            # Clean up temp file
            requests.delete(f"{self.sandbox_url}/api/files/{self.session_id}/content",
                          json={"path": temp_file})
            
            return result
            
        except Exception as e:
            raise Exception(f"Failed to execute Python code: {e}")
    
    def execute_nodejs_code(self, code: str, timeout: int = 30) -> Dict[str, Any]:
        """Execute Node.js code in the runtime sandbox"""
        try:
            # Create temporary JavaScript file
            temp_file = f"/tmp/agent_zero_{int(time.time())}.js"
            
            # Write code to file via our file API
            response = requests.post(f"{self.sandbox_url}/api/files/{self.session_id}/content",
                                   json={
                                       "path": temp_file,
                                       "content": code,
                                       "mimeType": "text/javascript"
                                   })
            
            if response.status_code != 200:
                raise Exception(f"Failed to write JavaScript file: {response.status_code}")
            
            # Execute the JavaScript file
            result = self.execute_command(f"node {temp_file}", timeout)
            
            # Clean up temp file
            requests.delete(f"{self.sandbox_url}/api/files/{self.session_id}/content",
                          json={"path": temp_file})
            
            return result
            
        except Exception as e:
            raise Exception(f"Failed to execute Node.js code: {e}")
    
    def get_session_id(self) -> Optional[str]:
        """Get the current sandbox session ID"""
        return self.session_id
    
    def get_files(self) -> Dict[str, Any]:
        """Get file tree from the runtime sandbox"""
        if not self.session_id:
            return {}
        
        try:
            response = requests.get(f"{self.sandbox_url}/api/files?sessionId={self.session_id}")
            if response.status_code == 200:
                return response.json()
            else:
                return {}
        except Exception:
            return {}
    
    def read_file(self, file_path: str) -> str:
        """Read a file from the runtime sandbox"""
        if not self.session_id:
            raise Exception("No active sandbox session")
        
        try:
            response = requests.get(f"{self.sandbox_url}/api/files/{self.session_id}/content", 
                                  params={"path": file_path})
            
            if response.status_code == 200:
                return response.json().get("content", "")
            else:
                raise Exception(f"Failed to read file: {response.status_code}")
                
        except Exception as e:
            raise Exception(f"Failed to read file {file_path}: {e}")
    
    def write_file(self, file_path: str, content: str, mime_type: str = "text/plain") -> bool:
        """Write a file to the runtime sandbox"""
        if not self.session_id:
            raise Exception("No active sandbox session")
        
        try:
            response = requests.post(f"{self.sandbox_url}/api/files/{self.session_id}/content",
                                   json={
                                       "path": file_path,
                                       "content": content,
                                       "mimeType": mime_type
                                   })
            
            return response.status_code == 200
            
        except Exception as e:
            PrintStyle.error(f"Failed to write file {file_path}: {e}")
            return False

# For compatibility with existing Agent Zero code
DockerContainerManager = RuntimeSandboxManager