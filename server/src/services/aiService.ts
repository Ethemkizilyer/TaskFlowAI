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

  async generateDailyBriefing(data: {
    userName: string;
    role: string;
    yesterdayActivities: Array<{ type: string; description: string; taskTitle?: string }>;
    todayTasks: Array<{ title: string; priority: string; status: string; dueDate?: string; boardTitle?: string }>;
    overdueTasks: Array<{ title: string; priority: string; boardTitle?: string; daysOverdue: number }>;
    teamStats: { totalMembers: number; activeTasks: number; completedToday: number };
    boards: Array<{ title: string; taskCount: number; doneCount: number }>;
  }): Promise<{
    greeting: string;
    summary: string;
    priorities: Array<{ title: string; reason: string; urgency: 'high' | 'medium' | 'low' }>;
    risks: string[];
    recommendations: string[];
    focusTip: string;
  }> {
    try {
      const prompt = `You are an AI productivity coach for a project management app called TaskFlow AI. Generate a personalized daily briefing for the user.

User: ${data.userName} (Role: ${data.role})

Yesterday's activities:
${data.yesterdayActivities.map(a => `- ${a.description}`).join('\n') || '- No activity recorded'}

Today's tasks:
${data.todayTasks.map(t => `- [${t.priority}] ${t.title} (${t.status})${t.boardTitle ? ' in ' + t.boardTitle : ''}${t.dueDate ? ' due: ' + t.dueDate : ''}`).join('\n') || '- No tasks assigned today'}

Overdue tasks:
${data.overdueTasks.map(t => `- [${t.priority}] ${t.title} (${t.daysOverdue} days overdue)${t.boardTitle ? ' in ' + t.boardTitle : ''}`).join('\n') || '- None'}

Team stats: ${data.teamStats.totalMembers} members, ${data.teamStats.activeTasks} active tasks, ${data.teamStats.completedToday} completed today

Boards:
${data.boards.map(b => `- ${b.title}: ${b.doneCount}/${b.taskCount} done`).join('\n') || '- No boards'}

Respond ONLY in valid JSON:
{
  "greeting": "personalized greeting with user's name",
  "summary": "2-3 sentence overview of their current work state",
  "priorities": [{"title": "task title", "reason": "why it's priority", "urgency": "high|medium|low"}],
  "risks": ["risk 1", "risk 2"],
  "recommendations": ["actionable recommendation 1", "recommendation 2"],
  "focusTip": "one practical productivity tip for today"
}

Keep it concise, motivating, and actionable. Maximum 3 priorities, 3 risks, 3 recommendations.`;

      const text = await this.generate(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.fallbackBriefing(data);
    } catch (error) {
      console.error('AI generateDailyBriefing error:', error);
      return this.fallbackBriefing(data);
    }
  }

  private fallbackBriefing(data: {
    userName: string;
    yesterdayActivities: any[];
    todayTasks: any[];
    overdueTasks: any[];
  }): {
    greeting: string;
    summary: string;
    priorities: Array<{ title: string; reason: string; urgency: 'high' | 'medium' | 'low' }>;
    risks: string[];
    recommendations: string[];
    focusTip: string;
  } {
    const overdue = data.overdueTasks.length;
    const today = data.todayTasks.length;
    const yesterday = data.yesterdayActivities.length;
    return {
      greeting: `Good morning, ${data.userName}!`,
      summary: `You have ${today} tasks today${overdue > 0 ? ` and ${overdue} overdue` : ''}. Yesterday you completed ${yesterday} activit${yesterday === 1 ? 'y' : 'ies'}.`,
      priorities: data.overdueTasks.slice(0, 3).map((t: any) => ({
        title: t.title,
        reason: `${t.daysOverdue} days overdue`,
        urgency: 'high' as const,
      })),
      risks: overdue > 0 ? [`${overdue} overdue task${overdue > 1 ? 's' : ''} need attention`] : [],
      recommendations: overdue > 0 ? ['Address overdue tasks first'] : ['Review your task list and set priorities'],
      focusTip: 'Start with your most important task before checking emails or messages.',
    };
  }

  async chat(
    message: string,
    context: { userName: string; boards: any[]; recentTasks: any[] },
    history: { role: string; content: string }[] = []
  ): Promise<{ reply: string; action?: { type: string; data: any } }> {
    try {
      const systemPrompt = `You are TaskFlow AI, a helpful assistant for a task management app.
The user's name is ${context.userName}.

Current boards: ${context.boards.map((b) => `"${b.title}" (${b.id})`).join(', ') || 'None'}

Recent tasks:
${context.recentTasks.map((t) => `- [${t.status}] ${t.title} (priority: ${t.priority}, board: ${t.board?.title || 'unknown'})`).join('\n') || 'No recent tasks'}

You can help users:
- Create tasks (respond with JSON action: {"type":"create_task","data":{"title":"...","priority":"MEDIUM"}})
- List tasks (respond with JSON action: {"type":"list_tasks","data":{"filter":"all|overdue|today"}})
- Summarize progress
- Give productivity advice
- Answer questions about their tasks

If the user wants to perform an action, include an "action" field in your JSON response.
Always respond in this JSON format:
{"reply": "your text response", "action": null or action object}

Be concise and friendly. Use the user's language (if they speak Turkish, respond in Turkish).`;

      const conversationHistory = history
        .slice(-10)
        .map((h) => `${h.role}: ${h.content}`)
        .join('\n');

      const prompt = `${systemPrompt}

Conversation history:
${conversationHistory || 'None'}

User: ${message}

Respond ONLY in valid JSON:`;

      const text = await this.generate(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { reply: text || 'I could not process that request.' };
    } catch (error) {
      console.error('AI chat error:', error);
      return { reply: 'Sorry, I could not process that right now. Please try again.' };
    }
  }
}

export default new AIService();
