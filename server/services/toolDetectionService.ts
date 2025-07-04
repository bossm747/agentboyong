import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SecurityTool {
  name: string;
  path: string;
  category: string;
  description: string;
  version?: string;
  capabilities: string[];
  usage_examples: string[];
  available: boolean;
}

export class ToolDetectionService {
  private static instance: ToolDetectionService;
  private toolInventory: SecurityTool[] = [];
  private lastScan: Date | null = null;

  private constructor() {}

  public static getInstance(): ToolDetectionService {
    if (!ToolDetectionService.instance) {
      ToolDetectionService.instance = new ToolDetectionService();
    }
    return ToolDetectionService.instance;
  }

  public async scanAvailableTools(): Promise<SecurityTool[]> {
    console.log('🔍 Scanning for available security tools...');
    
    const toolDefinitions: Partial<SecurityTool>[] = [
      // Network Reconnaissance
      {
        name: 'nmap',
        category: 'network_reconnaissance',
        description: 'Advanced port scanner with service detection and OS fingerprinting',
        capabilities: ['port_scanning', 'service_detection', 'os_fingerprinting', 'script_scanning'],
        usage_examples: [
          'nmap -sS -O -sV target_ip',
          'nmap -p 1-65535 target_ip',
          'nmap --script vuln target_ip'
        ]
      },
      {
        name: 'masscan',
        category: 'network_reconnaissance',
        description: 'High-speed Internet port scanner',
        capabilities: ['fast_port_scanning', 'large_network_scanning'],
        usage_examples: [
          'masscan -p1-65535 192.168.1.0/24',
          'masscan --rate=1000 -p80,443 target_range'
        ]
      },
      {
        name: 'arp-scan',
        category: 'network_reconnaissance',
        description: 'ARP-based network discovery tool',
        capabilities: ['network_discovery', 'arp_enumeration'],
        usage_examples: [
          'arp-scan -l',
          'arp-scan 192.168.1.0/24'
        ]
      },
      {
        name: 'whois',
        category: 'network_reconnaissance',
        description: 'Domain information gathering tool',
        capabilities: ['domain_enumeration', 'registration_info'],
        usage_examples: [
          'whois example.com',
          'whois 192.168.1.1'
        ]
      },

      // Web Application Security
      {
        name: 'sqlmap',
        category: 'web_security',
        description: 'Automated SQL injection detection and exploitation',
        capabilities: ['sql_injection', 'database_enumeration', 'data_extraction'],
        usage_examples: [
          'sqlmap -u "http://target.com/page?id=1"',
          'sqlmap -u target_url --dbs',
          'sqlmap -u target_url --batch --risk=3 --level=5'
        ]
      },
      {
        name: 'nikto',
        category: 'web_security',
        description: 'Web vulnerability scanner',
        capabilities: ['web_vulnerability_scanning', 'cgi_scanning', 'server_configuration_analysis'],
        usage_examples: [
          'nikto -h http://target.com',
          'nikto -h target.com -p 80,443'
        ]
      },
      {
        name: 'dirb',
        category: 'web_security',
        description: 'Web directory and file brute forcer',
        capabilities: ['directory_enumeration', 'file_discovery'],
        usage_examples: [
          'dirb http://target.com',
          'dirb http://target.com /usr/share/wordlists/dirb/common.txt'
        ]
      },
      {
        name: 'gobuster',
        category: 'web_security',
        description: 'URI/DNS/vhost discovery tool',
        capabilities: ['directory_enumeration', 'dns_enumeration', 'vhost_discovery'],
        usage_examples: [
          'gobuster dir -u http://target.com -w wordlist.txt',
          'gobuster dns -d target.com -w subdomains.txt'
        ]
      },

      // Password Security
      {
        name: 'john',
        category: 'password_attacks',
        description: 'John the Ripper password cracker (54K+ c/s)',
        capabilities: ['password_cracking', 'hash_cracking', 'dictionary_attacks', 'brute_force'],
        usage_examples: [
          'john --wordlist=passwords.txt hashes.txt',
          'john --incremental hashes.txt',
          'john --show hashes.txt'
        ]
      },
      {
        name: 'hashcat',
        category: 'password_attacks',
        description: 'GPU-accelerated password recovery tool',
        capabilities: ['gpu_password_cracking', 'advanced_hash_attacks', 'mask_attacks'],
        usage_examples: [
          'hashcat -m 0 hashes.txt wordlist.txt',
          'hashcat -m 1000 -a 3 hashes.txt ?a?a?a?a?a?a'
        ]
      },

      // Network Analysis
      {
        name: 'wireshark',
        category: 'network_analysis',
        description: 'Network protocol analyzer',
        capabilities: ['packet_analysis', 'protocol_dissection', 'network_forensics'],
        usage_examples: [
          'wireshark -i eth0',
          'wireshark -r capture.pcap'
        ]
      },
      {
        name: 'tcpdump',
        category: 'network_analysis',
        description: 'Network packet capture tool',
        capabilities: ['packet_capture', 'traffic_monitoring'],
        usage_examples: [
          'tcpdump -i eth0',
          'tcpdump -w capture.pcap port 80'
        ]
      },
      {
        name: 'netcat',
        category: 'network_analysis',
        description: 'Network swiss army knife',
        capabilities: ['port_scanning', 'banner_grabbing', 'data_transfer', 'backdoor_creation'],
        usage_examples: [
          'nc -zv target.com 80',
          'nc -l -p 4444',
          'nc target.com 80'
        ]
      },
      {
        name: 'ettercap',
        category: 'network_analysis',
        description: 'Network sniffer and man-in-the-middle tool',
        capabilities: ['mitm_attacks', 'arp_poisoning', 'session_hijacking'],
        usage_examples: [
          'ettercap -T -M arp:remote /192.168.1.1// /192.168.1.100//',
          'ettercap -T -i eth0'
        ]
      },

      // Forensics
      {
        name: 'binwalk',
        category: 'forensics',
        description: 'Firmware analysis and file extraction tool',
        capabilities: ['firmware_analysis', 'file_extraction', 'entropy_analysis'],
        usage_examples: [
          'binwalk firmware.bin',
          'binwalk -e firmware.bin'
        ]
      },
      {
        name: 'foremost',
        category: 'forensics',
        description: 'File carving and recovery tool',
        capabilities: ['file_recovery', 'data_carving', 'deleted_file_recovery'],
        usage_examples: [
          'foremost -i disk_image.dd',
          'foremost -t jpg,png -i evidence.raw'
        ]
      },

      // Reverse Engineering
      {
        name: 'radare2',
        category: 'reverse_engineering',
        description: 'Reverse engineering framework',
        capabilities: ['binary_analysis', 'disassembly', 'debugging', 'exploit_development'],
        usage_examples: [
          'r2 binary_file',
          'r2 -A binary_file'
        ]
      },
      {
        name: 'gdb',
        category: 'reverse_engineering',
        description: 'GNU debugger',
        capabilities: ['debugging', 'memory_analysis', 'exploit_development'],
        usage_examples: [
          'gdb ./program',
          'gdb -p PID'
        ]
      }
    ];

    this.toolInventory = [];

    for (const toolDef of toolDefinitions) {
      try {
        const { stdout } = await execAsync(`which ${toolDef.name}`);
        const toolPath = stdout.trim();
        
        if (toolPath) {
          // Try to get version
          let version = 'unknown';
          try {
            const { stdout: versionOutput } = await execAsync(`${toolDef.name} --version 2>/dev/null || ${toolDef.name} -V 2>/dev/null || echo "version unknown"`);
            version = versionOutput.split('\n')[0].trim();
          } catch (e) {
            // Version detection failed, continue
          }

          const tool: SecurityTool = {
            name: toolDef.name!,
            path: toolPath,
            category: toolDef.category!,
            description: toolDef.description!,
            version,
            capabilities: toolDef.capabilities!,
            usage_examples: toolDef.usage_examples!,
            available: true
          };

          this.toolInventory.push(tool);
        }
      } catch (error) {
        // Tool not available
        const tool: SecurityTool = {
          name: toolDef.name!,
          path: '',
          category: toolDef.category!,
          description: toolDef.description!,
          capabilities: toolDef.capabilities!,
          usage_examples: toolDef.usage_examples!,
          available: false
        };
        this.toolInventory.push(tool);
      }
    }

    this.lastScan = new Date();
    console.log(`✅ Tool scan complete: ${this.toolInventory.filter(t => t.available).length}/${this.toolInventory.length} tools available`);
    
    return this.toolInventory;
  }

  public getAvailableTools(): SecurityTool[] {
    return this.toolInventory.filter(tool => tool.available);
  }

  public getToolsByCategory(category: string): SecurityTool[] {
    return this.toolInventory.filter(tool => tool.available && tool.category === category);
  }

  public getTool(name: string): SecurityTool | undefined {
    return this.toolInventory.find(tool => tool.name === name && tool.available);
  }

  public generateToolAwarenessPrompt(): string {
    const availableTools = this.getAvailableTools();
    
    if (availableTools.length === 0) {
      return "No security tools detected in the current environment.";
    }

    let prompt = `## AVAILABLE SECURITY TOOLS (${availableTools.length} tools detected)\n\n`;

    const categories = Array.from(new Set(availableTools.map(t => t.category)));
    
    for (const category of categories) {
      const categoryTools = this.getToolsByCategory(category);
      prompt += `### ${category.replace('_', ' ').toUpperCase()}\n`;
      
      for (const tool of categoryTools) {
        prompt += `- **${tool.name}** (${tool.path})\n`;
        prompt += `  ${tool.description}\n`;
        prompt += `  Capabilities: ${tool.capabilities.join(', ')}\n`;
        prompt += `  Example: ${tool.usage_examples[0]}\n\n`;
      }
    }

    prompt += `## USAGE INSTRUCTIONS\n`;
    prompt += `When performing security tasks, automatically select and use the appropriate tools:\n`;
    prompt += `- Use nmap for comprehensive port scanning and service detection\n`;
    prompt += `- Use sqlmap for SQL injection testing and database exploitation\n`;
    prompt += `- Use john/hashcat for password cracking with wordlists\n`;
    prompt += `- Use gobuster/dirb for directory and file discovery\n`;
    prompt += `- Use nikto for web vulnerability scanning\n`;
    prompt += `- Combine multiple tools for comprehensive security assessments\n\n`;

    return prompt;
  }

  public async createCustomSecurityTool(toolName: string, purpose: string, techniques: string[]): Promise<string> {
    const toolCode = `#!/usr/bin/env python3
"""
Custom Security Tool: ${toolName}
Purpose: ${purpose}
Generated by Pareng Boyong Agent Zero
"""

import subprocess
import sys
import os
import socket
import threading
import time
from pathlib import Path

class ${toolName.replace(/[^a-zA-Z0-9]/g, '')}:
    def __init__(self):
        self.name = "${toolName}"
        self.purpose = "${purpose}"
        self.techniques = ${JSON.stringify(techniques)}
        self.results = []
        
    def run_command(self, command, timeout=60):
        """Execute system command with timeout"""
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                timeout=timeout
            )
            return {
                'success': True,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'returncode': result.returncode
            }
        except subprocess.TimeoutExpired:
            return {'success': False, 'error': 'Command timed out'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def log_result(self, technique, target, result):
        """Log security testing results"""
        self.results.append({
            'technique': technique,
            'target': target,
            'result': result,
            'timestamp': time.time()
        })
    
    def generate_report(self):
        """Generate security assessment report"""
        report = f"Security Assessment Report: {self.name}\\n"
        report += f"Purpose: {self.purpose}\\n"
        report += f"Techniques Used: {', '.join(self.techniques)}\\n"
        report += f"Total Tests: {len(self.results)}\\n\\n"
        
        for result in self.results:
            report += f"Technique: {result['technique']}\\n"
            report += f"Target: {result['target']}\\n"
            report += f"Result: {result['result']}\\n"
            report += "-" * 50 + "\\n"
        
        return report

def main():
    print(f"🎯 Agent Zero Custom Tool: ${toolName}")
    print(f"Purpose: ${purpose}")
    print(f"Techniques: {techniques.join(', ')}")
    
    tool = ${toolName.replace(/[^a-zA-Z0-9]/g, '')}()
    
    # Add your custom security logic here
    print("\\n✅ Custom security tool ready for deployment")
    print("Modify this template to implement specific security techniques")

if __name__ == "__main__":
    main()
`;

    const toolPath = `workspace/tools/${toolName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.py`;
    
    try {
      // Write the custom tool file
      await import('fs').then(fs => 
        fs.promises.writeFile(toolPath, toolCode)
      );
      
      // Make it executable
      await execAsync(`chmod +x ${toolPath}`);
      
      return `✅ Custom security tool created: ${toolPath}\n\nTool capabilities:\n- ${techniques.join('\n- ')}\n\nThe tool is ready for customization and deployment.`;
    } catch (error) {
      return `❌ Failed to create custom tool: ${error}`;
    }
  }
}

export const toolDetectionService = ToolDetectionService.getInstance();