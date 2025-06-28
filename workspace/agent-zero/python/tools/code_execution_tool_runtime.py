"""
Modified Code Execution Tool that uses our Runtime Sandbox instead of Docker
This replaces the original code_execution_tool.py with runtime sandbox integration
"""

import asyncio
from dataclasses import dataclass
import shlex
import time
from python.helpers.tool import Tool, Response
from python.helpers import files, rfc_exchange
from python.helpers.print_style import PrintStyle
from python.helpers.shell_runtime import RuntimeInteractiveSession
from python.helpers.runtime_sandbox import RuntimeSandboxManager
from python.helpers.messages import truncate_text
import re


@dataclass
class State:
    shells: dict[int, RuntimeInteractiveSession]
    sandbox: RuntimeSandboxManager | None


class CodeExecution(Tool):

    async def execute(self, **kwargs):

        await self.agent.handle_intervention()  # wait for intervention and handle it, if paused

        await self.prepare_state()

        runtime = self.args.get("runtime", "").lower().strip()
        session = int(self.args.get("session", 0))

        if runtime == "python":
            response = await self.execute_python_code(
                code=self.args["code"], session=session
            )
        elif runtime == "nodejs":
            response = await self.execute_nodejs_code(
                code=self.args["code"], session=session
            )
        elif runtime == "terminal":
            response = await self.execute_terminal_command(
                command=self.args["code"], session=session
            )
        elif runtime == "output":
            response = await self.get_terminal_output(
                session=session, first_output_timeout=60, between_output_timeout=5
            )
        elif runtime == "reset":
            await self.reset_terminal()
            response = Response(
                message="Terminal/Python session was reset.", data=self.args
            )
        else:
            response = Response(
                message=f"Unknown runtime: {runtime}", data=self.args
            )

        # Display and return response message
        if response.message:
            self.agent.context.log.log(type="response", content=response.message)
        return response

    async def prepare_state(self, reset: bool = False):

        if not hasattr(self.agent, "_cet_state") or self.agent.get_data("_cet_state") is None:
            shells = {}
            sandbox = None
        else:
            state = self.agent.get_data("_cet_state")
            shells = state.shells
            sandbox = state.sandbox

        # Initialize runtime sandbox if needed
        if sandbox is None or reset:
            # Clean up existing sandbox if resetting
            if sandbox:
                sandbox.cleanup_container()

            # Create new sandbox connection
            if self.agent.config.code_exec_ssh_enabled:
                # Use SSH config but route through our runtime sandbox
                sandbox = RuntimeSandboxManager(
                    image="runtime-sandbox",  # Not used but kept for compatibility
                    name=f"agent-zero-{self.agent.agent_name}",
                    logger=self.agent.context.log
                )
            else:
                # Use local runtime sandbox
                sandbox = RuntimeSandboxManager(
                    image="runtime-sandbox",
                    name=f"agent-zero-{self.agent.agent_name}",
                    logger=self.agent.context.log
                )

            if reset:
                # Close all existing shell sessions
                for s in list(shells.keys()):
                    shells[s].close()
                shells = {}

            # Initialize runtime shell interface for session 0 if needed
            if 0 not in shells:
                shell = RuntimeInteractiveSession(self.agent.context.log)
                shells[0] = shell
                await shell.connect()

            self.state = State(shells=shells, sandbox=sandbox)
        else:
            self.state = State(shells=shells, sandbox=sandbox)
            
        self.agent.set_data("_cet_state", self.state)

    async def execute_python_code(self, session: int, code: str, reset: bool = False):
        """Execute Python code using our runtime sandbox"""
        await self.agent.handle_intervention()
        
        if reset:
            await self.reset_terminal()

        if session not in self.state.shells:
            shell = RuntimeInteractiveSession(self.agent.context.log)
            self.state.shells[session] = shell
            await shell.connect()

        try:
            # Execute Python code directly through the runtime sandbox
            result = self.state.shells[session].execute_python_code(code)
            
            PrintStyle(
                background_color="white", font_color="#1B4F72", bold=True
            ).print(f"{self.agent.agent_name} Python execution output")
            
            # Format output similar to original tool
            output = ""
            if result.get("stdout"):
                output += result["stdout"]
            if result.get("stderr"):
                if output:
                    output += "\n"
                output += "STDERR: " + result["stderr"]
            
            if not output:
                output = "Code executed successfully (no output)"
            
            # Truncate if too long
            output = truncate_text(output, 50000, 5000)
            
            return Response(message=output, data=self.args)
            
        except Exception as e:
            error_msg = f"Python execution failed: {str(e)}"
            PrintStyle.error(error_msg)
            return Response(message=error_msg, data=self.args)

    async def execute_nodejs_code(self, session: int, code: str, reset: bool = False):
        """Execute Node.js code using our runtime sandbox"""
        await self.agent.handle_intervention()
        
        if reset:
            await self.reset_terminal()

        if session not in self.state.shells:
            shell = RuntimeInteractiveSession(self.agent.context.log)
            self.state.shells[session] = shell
            await shell.connect()

        try:
            # Execute Node.js code directly through the runtime sandbox
            result = self.state.shells[session].execute_nodejs_code(code)
            
            PrintStyle(
                background_color="white", font_color="#1B4F72", bold=True
            ).print(f"{self.agent.agent_name} Node.js execution output")
            
            # Format output similar to original tool
            output = ""
            if result.get("stdout"):
                output += result["stdout"]
            if result.get("stderr"):
                if output:
                    output += "\n"
                output += "STDERR: " + result["stderr"]
            
            if not output:
                output = "Code executed successfully (no output)"
            
            # Truncate if too long
            output = truncate_text(output, 50000, 5000)
            
            return Response(message=output, data=self.args)
            
        except Exception as e:
            error_msg = f"Node.js execution failed: {str(e)}"
            PrintStyle.error(error_msg)
            return Response(message=error_msg, data=self.args)

    async def execute_terminal_command(self, session: int, command: str, reset: bool = False):
        """Execute terminal command using our runtime sandbox"""
        return await self.terminal_session(session, command, reset)

    async def terminal_session(self, session: int, command: str, reset: bool = False):

        await self.agent.handle_intervention()
        
        # Try again on lost connection
        for i in range(2):
            try:
                if reset:
                    await self.reset_terminal()

                if session not in self.state.shells:
                    shell = RuntimeInteractiveSession(self.agent.context.log)
                    self.state.shells[session] = shell
                    await shell.connect()

                self.state.shells[session].send_command(command)

                PrintStyle(
                    background_color="white", font_color="#1B4F72", bold=True
                ).print(f"{self.agent.agent_name} terminal execution output")
                
                return await self.get_terminal_output(session)

            except Exception as e:
                if i == 1:
                    # Try again on lost connection
                    PrintStyle.error(str(e))
                    await self.prepare_state(reset=True)
                    continue
                else:
                    raise e

    async def get_terminal_output(
        self,
        session=0,
        reset_full_output=True,
        first_output_timeout=30,
        between_output_timeout=15,
        dialog_timeout=5,
        max_exec_timeout=180,
        sleep_time=0.1,
    ):
        """Get terminal output from our runtime sandbox"""
        
        if session not in self.state.shells:
            return Response(message="No active shell session", data=self.args)

        try:
            # Get output from the runtime sandbox
            output = self.state.shells[session].read_output()
            
            if not output:
                output = "(no output)"
            
            # Truncate if too long
            output = truncate_text(output, 50000, 5000)
            
            return Response(message=output, data=self.args)
            
        except Exception as e:
            error_msg = f"Failed to get terminal output: {str(e)}"
            PrintStyle.error(error_msg)
            return Response(message=error_msg, data=self.args)

    async def reset_terminal(self):
        """Reset all terminal sessions"""
        if hasattr(self, 'state') and self.state:
            # Close all shell sessions
            for session_id, shell in self.state.shells.items():
                try:
                    shell.close()
                except:
                    pass
            
            # Clear shells
            self.state.shells = {}
            
            # Reset sandbox connection
            if self.state.sandbox:
                try:
                    self.state.sandbox.cleanup_container()
                except:
                    pass
            
            # Prepare new state
            await self.prepare_state(reset=True)

    def get_session_info(self, session: int = 0) -> dict:
        """Get information about the current session"""
        if session in self.state.shells:
            shell = self.state.shells[session]
            return {
                "session_id": shell.get_session_id(),
                "connected": shell.is_connected(),
                "working_directory": shell.get_working_directory() if hasattr(shell, 'get_working_directory') else "/tmp"
            }
        return {"connected": False}

    def list_sessions(self) -> list:
        """List all active sessions"""
        return list(self.state.shells.keys()) if hasattr(self, 'state') and self.state else []