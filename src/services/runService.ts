// Run 服务层

import { type Run, type ModelParameters } from '../types';
import { db } from '../storage/db';
import { generateId } from '../utils/id';
import { promptService } from './promptService';

export interface RunOptions {
  promptId: string;
  input: Record<string, any>;
  model: string;
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

    // 填充变量
    let filledPrompt = prompt.template.goal || '';
    if (prompt.template.inputSlots) {
      prompt.template.inputSlots.forEach((slot) => {
        const value = options.input[slot.name] || slot.defaultValue || '';
        filledPrompt = filledPrompt.replace(
          new RegExp(`\\{\\{${slot.name}\\}\\}`, 'g'),
          String(value)
        );
      });
    }

    // 这里应该调用实际的 AI 模型 API
    // 目前返回模拟结果
    const startTime = Date.now();
    const output = await this.callModelAPI(filledPrompt, options.model, options.parameters);
    const latency = Date.now() - startTime;

    // 保存运行记录
    const run: Run = {
      id: generateId(),
      promptId: options.promptId,
      input: options.input,
      output,
      model: options.model,
      parameters: options.parameters || {},
      latency,
      abTestGroup: options.abTestGroup,
      createdAt: Date.now(),
    };

    await db.saveRun(run);

    // 增加使用次数
    await promptService.incrementUsageCount(options.promptId);

    return run;
  }

  /**
   * 调用模型 API（模拟）
   */
  private async callModelAPI(
    prompt: string,
    model: string,
    _parameters?: ModelParameters
  ): Promise<string> {
    // TODO: 实现实际的 API 调用
    // 这里返回模拟响应
    return `[模拟响应] 模型: ${model}\n\n输入: ${prompt.substring(0, 100)}...\n\n这是一个模拟的 AI 响应。实际使用时需要集成真实的 API。`;
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

