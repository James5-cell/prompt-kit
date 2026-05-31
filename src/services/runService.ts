// Run 服务层

import { type Run, type ModelParameters } from '../types';
import { db } from '../storage/db';
import { generateId } from '../utils/id';
import { promptService } from './promptService';
import { aiService } from './aiService';
import type { AIProvider } from './aiProviders/types';

export interface RunOptions {
  promptId: string;
  input: Record<string, any>;
  model: string;
  provider?: AIProvider; // AI provider to use (gemini, openai, nvidia)
  parameters?: ModelParameters;
  abTestGroup?: string;
}

export class RunService {
  /**
   * 执行 Prompt 运行
   */
  async executeRun(options: RunOptions): Promise<Run> {
    const prompt = await promptService.getPrompt(options.promptId);
    if (!prompt) {
      throw new Error(`Prompt ${options.promptId} not found`);
    }

    // 填充变量 - 简化版本：直接使用 content，替换 {{变量名}} 占位符
    let filledPrompt = prompt.content;
    Object.keys(options.input).forEach((key) => {
      const value = options.input[key] || '';
      filledPrompt = filledPrompt.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        String(value)
      );
    });

    // 确保 AI service 已初始化
    await aiService.initialize();

    // 调用实际的 AI 模型 API
    const startTime = Date.now();
    const provider = options.provider || aiService.getDefaultProvider();
    const aiResponse = await aiService.generateText(
      filledPrompt,
      provider,
      {
        model: options.model,
        temperature: options.parameters?.temperature,
        maxTokens: options.parameters?.maxTokens,
        topP: options.parameters?.topP,
        frequencyPenalty: options.parameters?.frequencyPenalty,
        presencePenalty: options.parameters?.presencePenalty,
      }
    );

    const latency = Date.now() - startTime;

    if (aiResponse.error) {
      throw new Error(aiResponse.error);
    }

    // 增加使用次数
    await promptService.incrementUsageCount(options.promptId);

    // 保存运行记录
    const run: Run = {
      id: generateId(),
      promptId: options.promptId,
      input: options.input,
      output: aiResponse.text,
      model: aiResponse.model || options.model,
      parameters: options.parameters || {},
      latency,
      abTestGroup: options.abTestGroup,
      createdAt: Date.now(),
    };

    await db.saveRun(run);

    return run;
  }


  /**
   * 批量执行
   */
  async batchExecute(
    promptId: string,
    inputs: Record<string, any>[],
    model: string,
    parameters?: ModelParameters
  ): Promise<Run[]> {
    const runs: Run[] = [];
    for (const input of inputs) {
      const run = await this.executeRun({
        promptId,
        input,
        model,
        parameters,
      });
      runs.push(run);
    }
    return runs;
  }

  /**
   * 获取 Prompt 的所有运行记录
   */
  async getRunsByPromptId(promptId: string): Promise<Run[]> {
    return db.getRunsByPromptId(promptId);
  }

  /**
   * 获取运行记录
   */
  async getRun(id: string): Promise<Run | null> {
    return db.getRun(id);
  }

  /**
   * 获取所有运行记录
   */
  async getAllRuns(): Promise<Run[]> {
    return db.getAllRuns();
  }

  /**
   * 更新运行记录的评分
   */
  async updateRunRating(id: string, rating: number, notes?: string): Promise<void> {
    const run = await db.getRun(id);
    if (run) {
      run.rating = rating;
      run.notes = notes;
      await db.saveRun(run);
    }
  }
}

export const runService = new RunService();

