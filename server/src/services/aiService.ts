import { GoogleGenAI } from '@google/genai';
import { config } from '../config';

class AIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
  }

  private async generate(prompt: string): Promise<string> {
    if (!this.ai) {
      throw new Error('AI service not configured. Set GEMINI_API_KEY in .env');
    }
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  }

  async suggestPriority(title: string, description?: string): Promise<{
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    reasoning: string;
  }> {
    try {
      const prompt = `You are a project management AI assistant. Analyze the following task and suggest a priority level.

Task title: "${title}"
Task description: "${description || 'No description provided'}"

Respond ONLY in valid JSON format:
{"priority": "LOW|MEDIUM|HIGH|URGENT", "reasoning": "brief explanation"}

Consider urgency, impact, dependencies, and complexity.`;

      const text = await this.generate(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { priority: 'MEDIUM', reasoning: 'Unable to determine priority' };
    } catch (error) {
      console.error('AI suggestPriority error:', error);
      return { priority: 'MEDIUM', reasoning: 'AI service unavailable' };
    }
  }

  async suggestTags(title: string, description?: string): Promise<string[]> {
    try {
      const prompt = `You are a task categorization AI. Analyze the following task and suggest 2-5 relevant tags.

Task title: "${title}"
Task description: "${description || 'No description provided'}"

Respond ONLY in valid JSON format:
{"tags": ["tag1", "tag2", "tag3"]}

Use short, lowercase tags like: design, backend, frontend, bug, feature, urgent, docs, testing, devops, security, api, ui, database, research, marketing.`;

      const text = await this.generate(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.tags || [];
      }
      return [];
    } catch (error) {
      console.error('AI suggestTags error:', error);
      return [];
    }
  }

  async generateSubtasks(title: string, description?: string): Promise<
    Array<{ title: string; description: string }>
  > {
    try {
      const prompt = `You are a project management AI assistant. Break down the following task into 3-5 actionable subtasks.

Task title: "${title}"
Task description: "${description || 'No description provided'}"

Respond ONLY in valid JSON format:
{"subtasks": [{"title": "subtask title", "description": "brief description"}]}

Make subtasks specific, actionable, and ordered logically.`;

      const text = await this.generate(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.subtasks || [];
      }
      return [];
    } catch (error) {
      console.error('AI generateSubtasks error:', error);
      return [];
    }
  }

  async analyzeBoardTasks(tasks: Array<{ title: string; description?: string; status: string; priority: string }>): Promise<{
    summary: string;
    recommendations: string[];
    riskTasks: string[];
  }> {
    try {
      const tasksJson = JSON.stringify(tasks);
      const prompt = `You are a project management AI assistant. Analyze the following board tasks and provide insights.

Tasks: ${tasksJson}

Respond ONLY in valid JSON format:
{
  "summary": "overall project health summary",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "riskTasks": ["task titles that are at risk"]
}

Focus on: bottlenecks, overdue risks, unbalanced workload, and missing critical tasks.`;

      const text = await this.generate(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { summary: 'Analysis unavailable', recommendations: [], riskTasks: [] };
    } catch (error) {
      console.error('AI analyzeBoardTasks error:', error);
      return { summary: 'AI service unavailable', recommendations: [], riskTasks: [] };
    }
  }

  async generateTaskFromDescription(description: string): Promise<{
    title: string;
    description: string;
    priority: string;
    tags: string[];
  }> {
    try {
      const prompt = `You are a project management AI assistant. Create a well-structured task from the following rough description.

User input: "${description}"

Respond ONLY in valid JSON format:
{
  "title": "concise task title (max 80 chars)",
  "description": "detailed task description",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "tags": ["relevant", "tags"]
}

Make the title clear and actionable. The description should include acceptance criteria.`;

      const text = await this.generate(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        title: description.slice(0, 80),
        description,
        priority: 'MEDIUM',
        tags: [],
      };
    } catch (error) {
      console.error('AI generateTaskFromDescription error:', error);
      return {
        title: description.slice(0, 80),
        description,
        priority: 'MEDIUM',
        tags: [],
      };
    }
  }

  isConfigured(): boolean {
    return this.ai !== null;
  }
}

export default new AIService();
