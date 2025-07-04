export interface SecurityScenario {
  name: string;
  description: string;
  tools_required: string[];
  methodology: string[];
  commands: string[];
  expected_outputs: string[];
  follow_up_actions: string[];
}

export interface ToolUsagePattern {
  tool: string;
  primary_use_cases: string[];
  common_flags: { [key: string]: string };
  best_practices: string[];
  common_mistakes: string[];
  integration_with: string[];
}

export class SecurityKnowledgeBase {
  private static instance: SecurityKnowledgeBase;
  
  private scenarios: SecurityScenario[] = [
    {
      name: "Network Reconnaissance",
      description: "Comprehensive network discovery and service enumeration",
      tools_required: ["nmap", "masscan", "arp-scan"],
      methodology: [
        "1. Discover live hosts with ping sweep",
        "2. Perform comprehensive port scan",
        "3. Enumerate services and versions",
        "4. Perform OS fingerprinting",
        "5. Run vulnerability scripts"
      ],
      commands: [
        "nmap -sn 192.168.1.0/24",
        "nmap -sS -sV -O -p- target_ip",
        "nmap --script vuln target_ip",
        "masscan -p1-65535 --rate=1000 target_range"
      ],
      expected_outputs: [
        "List of live hosts",
        "Open ports and services",
        "Service versions and OS details",
        "Potential vulnerabilities"
      ],
      follow_up_actions: [
        "Research identified services for known exploits",
        "Perform service-specific enumeration",
        "Test for default credentials",
        "Look for misconfigurations"
      ]
    },
    {
      name: "Web Application Assessment",
      description: "Complete web application security testing",
      tools_required: ["nikto", "gobuster", "sqlmap", "curl"],
      methodology: [
        "1. Perform initial web server scan",
        "2. Enumerate directories and files",
        "3. Test for SQL injection vulnerabilities",
        "4. Check for common web vulnerabilities",
        "5. Manual verification of findings"
      ],
      commands: [
        "nikto -h http://target.com",
        "gobuster dir -u http://target.com -w /workspace/wordlists/directories.txt",
        "sqlmap -u 'http://target.com/page?id=1' --batch",
        "curl -I http://target.com"
      ],
      expected_outputs: [
        "Web server information and vulnerabilities",
        "Hidden directories and files",
        "SQL injection points",
        "Server headers and technologies"
      ],
      follow_up_actions: [
        "Test identified injection points manually",
        "Enumerate database if SQL injection found",
        "Check for file upload vulnerabilities",
        "Test authentication mechanisms"
      ]
    },
    {
      name: "Password Security Assessment",
      description: "Password cracking and hash analysis",
      tools_required: ["john", "hashcat"],
      methodology: [
        "1. Identify hash types",
        "2. Prepare wordlists",
        "3. Perform dictionary attacks",
        "4. Use rule-based attacks",
        "5. Try brute force if necessary"
      ],
      commands: [
        "john --list=formats",
        "john --wordlist=/workspace/wordlists/common_passwords.txt hashes.txt",
        "john --rules --wordlist=wordlist.txt hashes.txt",
        "hashcat -m 0 -a 0 hashes.txt wordlist.txt"
      ],
      expected_outputs: [
        "Cracked passwords",
        "Hash format identification",
        "Crack rate statistics"
      ],
      follow_up_actions: [
        "Test cracked passwords on other systems",
        "Analyze password patterns",
        "Check for password reuse",
        "Document weak password policies"
      ]
    },
    {
      name: "Network Traffic Analysis",
      description: "Monitor and analyze network communications",
      tools_required: ["tcpdump", "wireshark", "netcat"],
      methodology: [
        "1. Identify network interfaces",
        "2. Capture network traffic",
        "3. Filter and analyze packets",
        "4. Extract useful information",
        "5. Identify security issues"
      ],
      commands: [
        "ip addr show",
        "tcpdump -i eth0 -w capture.pcap",
        "tcpdump -r capture.pcap 'port 80'",
        "nc -zv target.com 1-1000"
      ],
      expected_outputs: [
        "Network traffic patterns",
        "Unencrypted communications",
        "Network topology information"
      ],
      follow_up_actions: [
        "Look for sensitive data in traffic",
        "Identify network protocols",
        "Map network architecture",
        "Test for man-in-the-middle opportunities"
      ]
    }
  ];

  private toolPatterns: ToolUsagePattern[] = [
    {
      tool: "nmap",
      primary_use_cases: [
        "Port scanning and service detection",
        "Operating system fingerprinting",
        "Vulnerability scanning with NSE scripts",
        "Network discovery and host enumeration"
      ],
      common_flags: {
        "-sS": "TCP SYN scan (stealth scan)",
        "-sV": "Service version detection",
        "-O": "Operating system detection",
        "-A": "Aggressive scan (OS, version, script, traceroute)",
        "-p-": "Scan all 65535 ports",
        "--script": "Run NSE scripts (vuln, default, etc.)",
        "-Pn": "Skip host discovery",
        "-T4": "Aggressive timing template"
      },
      best_practices: [
        "Start with basic scans before aggressive ones",
        "Use appropriate timing to avoid detection",
        "Combine multiple scan types for complete coverage",
        "Always verify results manually"
      ],
      common_mistakes: [
        "Running aggressive scans without permission",
        "Not adjusting timing for network conditions",
        "Ignoring false positives in results",
        "Scanning unnecessary IP ranges"
      ],
      integration_with: ["masscan", "nikto", "sqlmap"]
    },
    {
      tool: "sqlmap",
      primary_use_cases: [
        "Automated SQL injection detection",
        "Database enumeration and data extraction",
        "File system access through SQL injection",
        "Command execution via SQL injection"
      ],
      common_flags: {
        "-u": "Target URL",
        "--batch": "Non-interactive mode",
        "--dbs": "Enumerate databases",
        "--tables": "Enumerate tables",
        "--dump": "Dump table data",
        "--risk": "Risk level (1-3)",
        "--level": "Test level (1-5)",
        "--tamper": "Use tamper scripts"
      },
      best_practices: [
        "Start with low risk/level settings",
        "Use batch mode for automation",
        "Save session data for resuming",
        "Verify findings manually"
      ],
      common_mistakes: [
        "Using maximum risk/level immediately",
        "Not handling session cookies properly",
        "Ignoring WAF detection",
        "Not testing different injection points"
      ],
      integration_with: ["nikto", "gobuster", "curl"]
    },
    {
      tool: "john",
      primary_use_cases: [
        "Password hash cracking",
        "Dictionary attacks with wordlists",
        "Rule-based password generation",
        "Brute force attacks"
      ],
      common_flags: {
        "--wordlist": "Specify wordlist file",
        "--rules": "Apply password generation rules",
        "--incremental": "Brute force mode",
        "--show": "Show cracked passwords",
        "--format": "Specify hash format",
        "--session": "Session name for resuming"
      },
      best_practices: [
        "Identify hash format before cracking",
        "Use targeted wordlists for better results",
        "Combine dictionary and rule attacks",
        "Save progress with session names"
      ],
      common_mistakes: [
        "Not identifying hash format correctly",
        "Using generic wordlists for targeted attacks",
        "Not using rules for common patterns",
        "Running without time limits"
      ],
      integration_with: ["hashcat", "custom wordlist generators"]
    }
  ];

  private constructor() {}

  public static getInstance(): SecurityKnowledgeBase {
    if (!SecurityKnowledgeBase.instance) {
      SecurityKnowledgeBase.instance = new SecurityKnowledgeBase();
    }
    return SecurityKnowledgeBase.instance;
  }

  public getScenario(name: string): SecurityScenario | undefined {
    return this.scenarios.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
  }

  public getToolPattern(tool: string): ToolUsagePattern | undefined {
    return this.toolPatterns.find(p => p.tool === tool);
  }

  public generateSecurityGuidance(task: string): string {
    let guidance = "## SECURITY TASK GUIDANCE\n\n";
    
    // Find relevant scenarios
    const relevantScenarios = this.scenarios.filter(s => 
      task.toLowerCase().includes(s.name.toLowerCase()) ||
      s.description.toLowerCase().includes(task.toLowerCase())
    );

    if (relevantScenarios.length > 0) {
      guidance += "### RELEVANT METHODOLOGIES:\n\n";
      
      for (const scenario of relevantScenarios) {
        guidance += `**${scenario.name}**\n`;
        guidance += `${scenario.description}\n\n`;
        
        guidance += "**Required Tools:**\n";
        scenario.tools_required.forEach(tool => {
          guidance += `- ${tool}\n`;
        });
        
        guidance += "\n**Methodology:**\n";
        scenario.methodology.forEach(step => {
          guidance += `${step}\n`;
        });
        
        guidance += "\n**Commands to Execute:**\n";
        scenario.commands.forEach(cmd => {
          guidance += `\`${cmd}\`\n`;
        });
        
        guidance += "\n**Expected Results:**\n";
        scenario.expected_outputs.forEach(output => {
          guidance += `- ${output}\n`;
        });
        
        guidance += "\n**Follow-up Actions:**\n";
        scenario.follow_up_actions.forEach(action => {
          guidance += `- ${action}\n`;
        });
        
        guidance += "\n---\n\n";
      }
    }

    // Add tool-specific guidance
    const mentionedTools = this.extractToolsFromTask(task);
    if (mentionedTools.length > 0) {
      guidance += "### TOOL-SPECIFIC GUIDANCE:\n\n";
      
      for (const toolName of mentionedTools) {
        const pattern = this.getToolPattern(toolName);
        if (pattern) {
          guidance += `**${pattern.tool.toUpperCase()}**\n`;
          guidance += "Use Cases:\n";
          pattern.primary_use_cases.forEach(useCase => {
            guidance += `- ${useCase}\n`;
          });
          
          guidance += "\nBest Practices:\n";
          pattern.best_practices.forEach(practice => {
            guidance += `- ${practice}\n`;
          });
          
          guidance += "\nAvoid These Mistakes:\n";
          pattern.common_mistakes.forEach(mistake => {
            guidance += `- ${mistake}\n`;
          });
          
          guidance += "\n";
        }
      }
    }

    guidance += "### EXECUTION APPROACH:\n";
    guidance += "1. **Prepare**: Ensure all required tools are available\n";
    guidance += "2. **Execute**: Run commands systematically\n";
    guidance += "3. **Analyze**: Interpret results carefully\n";
    guidance += "4. **Document**: Record all findings\n";
    guidance += "5. **Follow-up**: Take appropriate next steps\n\n";

    return guidance;
  }

  private extractToolsFromTask(task: string): string[] {
    const tools = ['nmap', 'sqlmap', 'nikto', 'john', 'hashcat', 'gobuster', 'dirb', 'masscan', 'tcpdump', 'wireshark'];
    return tools.filter(tool => task.toLowerCase().includes(tool));
  }

  public generateSandboxIntegrationGuide(): string {
    return `## SANDBOX INTEGRATION GUIDE

### ENVIRONMENT AWARENESS
- **Platform**: Replit with Nix package manager
- **OS**: Ubuntu 24.04 in containerized environment
- **Tools Location**: /nix/store/.../{tool}/bin/{tool}
- **Workspace**: ./workspace/{sessionId}/
- **Wordlists**: ./workspace/wordlists/
- **Custom Tools**: ./workspace/tools/

### SAFE TESTING PRACTICES
1. **Target Selection**: Only test authorized targets or local services
2. **Rate Limiting**: Use appropriate timing to avoid overloading
3. **Data Handling**: Store all results in workspace directories
4. **Session Management**: Use session IDs for isolation
5. **Resource Monitoring**: Be aware of system limitations

### TOOL EXECUTION PATTERNS
- **Direct Execution**: Use full paths when necessary
- **Output Capture**: Always capture stdout/stderr for analysis
- **Error Handling**: Implement proper timeout and error handling
- **Result Storage**: Save important findings to files
- **Progress Tracking**: Use background task system for long operations

### AUTOMATION WORKFLOWS
1. **Information Gathering**: nmap → service enumeration → vulnerability assessment
2. **Web Testing**: nikto → directory discovery → SQL injection testing
3. **Password Attacks**: hash identification → wordlist preparation → cracking
4. **Network Analysis**: interface discovery → traffic capture → analysis

### INTEGRATION WITH PARENG BOYONG
- **Tool Detection**: Automatically detect available tools
- **Smart Selection**: Choose appropriate tools based on task
- **Chain Operations**: Link tool outputs to next tool inputs
- **Result Correlation**: Combine findings from multiple tools
- **Report Generation**: Create comprehensive security reports`;
  }
}

export const securityKnowledgeBase = SecurityKnowledgeBase.getInstance();