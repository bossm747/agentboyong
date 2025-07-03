import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { db } from '../db';
import { 
  tools, 
  experiences, 
  reasoningChains, 
  knowledge,
  type InsertTool, 
  type InsertExperience, 
  type InsertReasoningChain,
  type InsertKnowledge,
  type Tool,
  type Experience,
  type ReasoningChain
} from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { TerminalService } from './terminal';
import { FileSystemService } from './fileSystem';

const genai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ProblemAnalysis {
  type: string;
  complexity: number;
  requiredCapabilities: string[];
  suggestedApproach: string;
  newToolsNeeded: boolean;
}

export interface ThoughtProcess {
  step: number;
  description: string;
  reasoning: string;
  options: string[];
  selectedOption: string;
  confidence: number;
}

export class CognitiveService {
  private terminal: TerminalService;
  private fileSystem: FileSystemService;

  constructor(sessionId: string) {
    this.terminal = new TerminalService(sessionId);
    this.fileSystem = new FileSystemService(sessionId);
  }

  async autonomousReasoningProcess(
    userId: string, 
    sessionId: string, 
    problemStatement: string
  ): Promise<{ 
    reasoning: ReasoningChain, 
    solution: string, 
    newToolsCreated: Tool[],
    experienceGained: Experience | null 
  }> {
    console.log(`🧠 Starting autonomous reasoning for: ${problemStatement}`);

    // Step 1: Analyze the problem
    const problemAnalysis = await this.analyzeProblem(problemStatement);
    
    // Step 2: Load relevant experience and tools
    const [relevantExperiences, availableTools, relevantKnowledge] = await Promise.all([
      this.loadRelevantExperiences(userId, problemAnalysis.type),
      this.loadAvailableTools(userId),
      this.loadRelevantKnowledge(userId, problemStatement)
    ]);

    // Step 3: Generate autonomous reasoning chain
    const thoughtProcess = await this.generateThoughtProcess(
      problemStatement, 
      problemAnalysis, 
      relevantExperiences, 
      availableTools,
      relevantKnowledge
    );

    // Step 4: Select and prepare tools
    const { selectedTools, newToolsToCreate } = await this.selectAndPrepareTools(
      userId, 
      problemAnalysis, 
      availableTools, 
      thoughtProcess
    );

    // Step 5: Create new tools if needed
    const newToolsCreated: Tool[] = [];
    for (const toolSpec of newToolsToCreate) {
      const newTool = await this.createTool(userId, toolSpec);
      if (newTool) {
        newToolsCreated.push(newTool);
        selectedTools.push(newTool);
      }
    }

    // Step 6: Execute solution plan
    const executionPlan = await this.createExecutionPlan(selectedTools, thoughtProcess);
    const solution = await this.executeSolutionPlan(executionPlan, selectedTools);

    // Step 7: Save reasoning chain
    const reasoningData: InsertReasoningChain = {
      userId,
      sessionId,
      problemStatement,
      thoughtProcess: thoughtProcess,
      toolsConsidered: availableTools.map(t => t.name),
      toolsSelected: selectedTools.map(t => t.name),
      executionPlan
    };

    const [reasoningChain] = await db.insert(reasoningChains).values(reasoningData).returning();

    // Step 8: Reflect and create experience
    const experienceGained = await this.reflectAndCreateExperience(
      userId, 
      problemStatement, 
      problemAnalysis, 
      selectedTools, 
      solution, 
      thoughtProcess
    );

    // Step 9: Update tool effectiveness
    await this.updateToolEffectiveness(selectedTools, solution);

    // Step 10: Generate knowledge insights
    await this.generateKnowledgeInsights(userId, problemStatement, solution, thoughtProcess);

    return {
      reasoning: reasoningChain,
      solution,
      newToolsCreated,
      experienceGained
    };
  }

  private async analyzeProblem(problemStatement: string): Promise<ProblemAnalysis> {
    const analysisPrompt = `Analyze this problem and provide a structured analysis:

Problem: ${problemStatement}

Analyze and return JSON with this structure:
{
  "type": "data_analysis|automation|research|security|development|general",
  "complexity": 1-10,
  "requiredCapabilities": ["capability1", "capability2"],
  "suggestedApproach": "detailed approach description",
  "newToolsNeeded": true/false
}`;

    const response = await this.callAI(analysisPrompt);
    try {
      return JSON.parse(response);
    } catch {
      return {
        type: 'general',
        complexity: 5,
        requiredCapabilities: ['analysis', 'problem_solving'],
        suggestedApproach: 'Break down problem into smaller components and solve systematically',
        newToolsNeeded: false
      };
    }
  }

  private async generateThoughtProcess(
    problemStatement: string,
    analysis: ProblemAnalysis,
    experiences: Experience[],
    tools: Tool[],
    knowledge: any[]
  ): Promise<ThoughtProcess[]> {
    const thinkingPrompt = `Think through this problem step by step like an advanced AI agent:

Problem: ${problemStatement}
Analysis: ${JSON.stringify(analysis)}
Available Tools: ${tools.map(t => `${t.name}: ${t.description}`).join(', ')}
Past Experiences: ${experiences.map(e => `${e.problemType}: ${e.solutionApproach}`).join('; ')}
Relevant Knowledge: ${knowledge.map(k => k.content).join('; ')}

Generate a step-by-step thought process. Return JSON array of thought steps:
[{
  "step": 1,
  "description": "What am I thinking about",
  "reasoning": "Why this step is important",
  "options": ["option1", "option2", "option3"],
  "selectedOption": "option1",
  "confidence": 0.8
}]

Think like Agent Zero - break down the problem, consider multiple approaches, and reason autonomously.`;

    const response = await this.callAI(thinkingPrompt);
    try {
      return JSON.parse(response);
    } catch {
      return [{
        step: 1,
        description: "Analyze problem requirements",
        reasoning: "Understanding the problem is the first step to solving it",
        options: ["direct approach", "systematic breakdown", "creative solution"],
        selectedOption: "systematic breakdown",
        confidence: 0.7
      }];
    }
  }

  private async selectAndPrepareTools(
    userId: string,
    analysis: ProblemAnalysis,
    availableTools: Tool[],
    thoughtProcess: ThoughtProcess[]
  ): Promise<{ selectedTools: Tool[], newToolsToCreate: any[] }> {
    const toolSelectionPrompt = `Based on this analysis and thought process, determine which tools to use:

Problem Analysis: ${JSON.stringify(analysis)}
Available Tools: ${availableTools.map(t => `${t.name}: ${t.description} (effectiveness: ${t.effectiveness})`).join('\n')}
Thought Process: ${JSON.stringify(thoughtProcess)}

Return JSON:
{
  "selectedToolNames": ["tool1", "tool2"],
  "newToolsNeeded": [
    {
      "name": "tool_name",
      "description": "what it does",
      "code": "actual implementation code",
      "language": "python|javascript|bash",
      "category": "analysis|automation|research|security"
    }
  ]
}`;

    const response = await this.callAI(toolSelectionPrompt);
    try {
      const selection = JSON.parse(response);
      const selectedTools = availableTools.filter(t => 
        selection.selectedToolNames.includes(t.name)
      );
      return {
        selectedTools,
        newToolsToCreate: selection.newToolsNeeded || []
      };
    } catch {
      return {
        selectedTools: availableTools.slice(0, 2), // fallback to first 2 tools
        newToolsToCreate: []
      };
    }
  }

  private async createTool(userId: string, toolSpec: any): Promise<Tool | null> {
    try {
      const toolData: InsertTool = {
        userId,
        name: toolSpec.name,
        description: toolSpec.description,
        code: toolSpec.code,
        language: toolSpec.language,
        category: toolSpec.category
      };

      const [newTool] = await db.insert(tools).values(toolData).returning();
      
      // Test the tool to ensure it works
      const testResult = await this.testTool(newTool);
      if (testResult.success) {
        console.log(`✅ Created new tool: ${newTool.name}`);
        return newTool;
      } else {
        console.log(`❌ Tool creation failed: ${testResult.error}`);
        await db.delete(tools).where(eq(tools.id, newTool.id));
        return null;
      }
    } catch (error) {
      console.error('Tool creation error:', error);
      return null;
    }
  }

  private async testTool(tool: Tool): Promise<{ success: boolean, error?: string }> {
    try {
      switch (tool.language) {
        case 'python':
          const pythonResult = await this.terminal.executeCommand('python3', ['-c', tool.code]);
          return { success: pythonResult.exitCode === 0, error: pythonResult.stderr };
        
        case 'javascript':
          const jsResult = await this.terminal.executeCommand('node', ['-e', tool.code]);
          return { success: jsResult.exitCode === 0, error: jsResult.stderr };
        
        case 'bash':
          const bashResult = await this.terminal.executeCommand('bash', ['-c', tool.code]);
          return { success: bashResult.exitCode === 0, error: bashResult.stderr };
        
        default:
          return { success: false, error: 'Unsupported language' };
      }
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  private async createExecutionPlan(tools: Tool[], thoughtProcess: ThoughtProcess[]): Promise<string> {
    const planPrompt = `Create a detailed execution plan using these tools and thought process:

Tools Available:
${tools.map(t => `${t.name}: ${t.description}\nCode: ${t.code}`).join('\n\n')}

Thought Process:
${JSON.stringify(thoughtProcess)}

Create a step-by-step execution plan that uses these tools effectively to solve the problem.`;

    return await this.callAI(planPrompt);
  }

  private async executeSolutionPlan(executionPlan: string, tools: Tool[]): Promise<string> {
    let result = `Execution Plan:\n${executionPlan}\n\nExecution Results:\n`;
    
    for (const tool of tools) {
      try {
        console.log(`🔧 Executing tool: ${tool.name}`);
        const toolResult = await this.executeTool(tool);
        result += `\n${tool.name} Result:\n${toolResult}\n`;
      } catch (error) {
        result += `\n${tool.name} Error: ${error}\n`;
      }
    }

    return result;
  }

  private async executeTool(tool: Tool): Promise<string> {
    switch (tool.language) {
      case 'python':
        const pythonResult = await this.terminal.executeCommand('python3', ['-c', tool.code]);
        return pythonResult.stdout || pythonResult.stderr || 'No output';
      
      case 'javascript':
        const jsResult = await this.terminal.executeCommand('node', ['-e', tool.code]);
        return jsResult.stdout || jsResult.stderr || 'No output';
      
      case 'bash':
        const bashResult = await this.terminal.executeCommand('bash', ['-c', tool.code]);
        return bashResult.stdout || bashResult.stderr || 'No output';
      
      default:
        return 'Unsupported tool language';
    }
  }

  private async reflectAndCreateExperience(
    userId: string,
    problemStatement: string,
    analysis: ProblemAnalysis,
    tools: Tool[],
    solution: string,
    thoughtProcess: ThoughtProcess[]
  ): Promise<Experience | null> {
    const reflectionPrompt = `Reflect on this problem-solving experience and extract learning insights:

Problem: ${problemStatement}
Tools Used: ${tools.map(t => t.name).join(', ')}
Solution: ${solution}
Thought Process: ${JSON.stringify(thoughtProcess)}

Return JSON:
{
  "outcome": "success|partial_success|failure",
  "learningInsights": "what was learned from this experience",
  "applicability": ["context1", "context2"] // where this approach can be applied
}`;

    try {
      const reflection = JSON.parse(await this.callAI(reflectionPrompt));
      
      const experienceData: InsertExperience = {
        userId,
        problemType: analysis.type,
        problemDescription: problemStatement,
        solutionApproach: `Used tools: ${tools.map(t => t.name).join(', ')}. ${thoughtProcess.map(t => t.selectedOption).join(' -> ')}`,
        toolsUsed: tools.map(t => t.name),
        outcome: reflection.outcome,
        learningInsights: reflection.learningInsights,
        applicability: reflection.applicability
      };

      const [experience] = await db.insert(experiences).values(experienceData).returning();
      return experience;
    } catch (error) {
      console.error('Experience creation error:', error);
      return null;
    }
  }

  private async updateToolEffectiveness(tools: Tool[], solution: string): Promise<void> {
    for (const tool of tools) {
      const wasSuccessful = solution.includes('success') || !solution.includes('error');
      
      if (wasSuccessful) {
        await db.update(tools).set({
          successCount: tool.successCount + 1,
          effectiveness: Math.min(1.0, tool.effectiveness + 0.1),
          lastUsed: new Date()
        }).where(eq(tools.id, tool.id));
      } else {
        await db.update(tools).set({
          failureCount: tool.failureCount + 1,
          effectiveness: Math.max(0.1, tool.effectiveness - 0.05),
          lastUsed: new Date()
        }).where(eq(tools.id, tool.id));
      }
    }
  }

  private async generateKnowledgeInsights(
    userId: string,
    problemStatement: string,
    solution: string,
    thoughtProcess: ThoughtProcess[]
  ): Promise<void> {
    const knowledgePrompt = `Extract reusable knowledge from this problem-solving session:

Problem: ${problemStatement}
Solution: ${solution}
Thought Process: ${JSON.stringify(thoughtProcess)}

Generate knowledge insights that can be useful for future problems. Return JSON array:
[{
  "topic": "knowledge topic",
  "content": "detailed knowledge content",
  "tags": ["tag1", "tag2"],
  "confidence": 0.8
}]`;

    try {
      const insights = JSON.parse(await this.callAI(knowledgePrompt));
      
      for (const insight of insights) {
        const knowledgeData: InsertKnowledge = {
          userId,
          topic: insight.topic,
          content: insight.content,
          source: 'experience',
          confidence: insight.confidence || 0.8,
          tags: insight.tags || []
        };

        await db.insert(knowledge).values(knowledgeData);
      }
    } catch (error) {
      console.error('Knowledge generation error:', error);
    }
  }

  // Helper methods for loading data
  private async loadRelevantExperiences(userId: string, problemType: string): Promise<Experience[]> {
    return await db.select()
      .from(experiences)
      .where(and(
        eq(experiences.userId, userId),
        eq(experiences.problemType, problemType)
      ))
      .orderBy(desc(experiences.createdAt))
      .limit(5);
  }

  private async loadAvailableTools(userId: string): Promise<Tool[]> {
    return await db.select()
      .from(tools)
      .where(eq(tools.userId, userId))
      .orderBy(desc(tools.effectiveness))
      .limit(10);
  }

  private async loadRelevantKnowledge(userId: string, problemStatement: string): Promise<any[]> {
    // Simple keyword matching for now - could be enhanced with vector search
    return await db.select()
      .from(knowledge)
      .where(eq(knowledge.userId, userId))
      .orderBy(desc(knowledge.confidence))
      .limit(5);
  }

  private async callAI(prompt: string): Promise<string> {
    try {
      // Try Gemini first
      const response = await genai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
      });
      return response.text || '';
    } catch (error) {
      // Fallback to OpenAI
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        });
        return response.choices[0].message.content || '';
      } catch (fallbackError) {
        console.error('Both AI services failed:', error, fallbackError);
        return '';
      }
    }
  }
}