import { type Prompt } from '../types';

export interface PromptValuePoints {
  scenario: string;         // [P 痛点/适用场景]
  deliverable: string;      // [O 产出/交付物]
  cleanCodeSnippet: string; // 过滤样板词后的核心逻辑片段
}

/**
 * 语法清洗工具：彻底消除原始机器语法、YAML/JSON 键名、markdown 标记及数字序号
 */
function cleanRawSyntax(str: string): string {
  if (!str) return '';
  let s = str;
  // 1. 去除破折号、星号、项目符号
  s = s.replace(/[-*•]/g, ' ');
  // 2. 去除机器键名
  s = s.replace(/\bwhat_it_does\b:?/gi, ' ');
  s = s.replace(/\bdescription\b:?/gi, ' ');
  s = s.replace(/\btarget_audience\b:?/gi, ' ');
  s = s.replace(/\bRole\b:?/gi, ' ');
  s = s.replace(/\bObjective\b:?/gi, ' ');
  s = s.replace(/概念[標标]題:?/g, ' ');
  // 3. 去除各种残留引号与反引号
  s = s.replace(/[「」""'`]/g, ' ');
  // 4. 去除「這個 Prompt 會：」等过渡引导语
  s = s.replace(/這個\s*Prompt\s*會[：:]?/gi, ' ');
  // 5. 去除数字序号（如 1. 2. 1) 2) 等）
  s = s.replace(/^[0-9]+[.)、]\s*/, ' ');
  s = s.replace(/\s+[0-9]+[.)、]\s*/g, ' ');
  // 6. 收敛连续空白
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * 痛点场景前缀修剪：移除「协助/针对/为了」等弱语感词汇，提升信息密度
 */
function cleanPainPrefix(str: string): string {
  if (!str) return '';
  let s = str.trim();
  s = s.replace(/^(針對|针对|協助|协助|幫助|帮助|專為|专为|適用於|适用于|用於|用于|旨在|透過|透过|基於|基于)/, '');
  s = s.replace(/^[\s,，、]+/, '');
  return s.trim();
}

/**
 * 高信噪比解析器：彻底消除 raw JSON/YAML 标记，提取确定性二元价值（痛点场景 + 交付产出）与精简指令代码
 */
export function extractPromptValuePoints(prompt: Prompt): PromptValuePoints {
  const rawSummary = (prompt.summary || '').trim();
  const rawContent = (prompt.content || '').trim();

  let scenario = '';
  let deliverable = '';

  // 策略 A: 若正文内存在结构化方括号标示，如 1. [安全漏洞]：... 3. [重构修复]：...
  const bracketMatches = Array.from(rawContent.matchAll(/\[([^\]]+)\][：:]\s*([^\n\r]+)/g));
  if (bracketMatches.length >= 2) {
    scenario = cleanPainPrefix(cleanRawSyntax(`${bracketMatches[0][1]}：${bracketMatches[0][2]}`));
    deliverable = cleanRawSyntax(`${bracketMatches[bracketMatches.length - 1][1]}：${bracketMatches[bracketMatches.length - 1][2]}`);
  }

  // 策略 B: 从 summary 分解提炼
  if ((!scenario || !deliverable) && rawSummary) {
    let beforeSplit = rawSummary;
    let afterSplit = '';

    const splitPatterns = [
      /這個\s*Prompt\s*會[：:]/i,
      /what_it_does\s*[:：]/i,
      /主要功能[：:]/i,
      /核心能力[：:]/i,
      /執行步驟[：:]/i,
    ];

    for (const pat of splitPatterns) {
      const match = rawSummary.match(pat);
      if (match && match.index !== undefined) {
        beforeSplit = rawSummary.slice(0, match.index);
        afterSplit = rawSummary.slice(match.index + match[0].length);
        break;
      }
    }

    const cleanBefore = cleanPainPrefix(cleanRawSyntax(beforeSplit));
    if (!scenario && cleanBefore.length >= 6) {
      scenario = cleanBefore;
    }

    if (afterSplit) {
      const cleanAfter = cleanRawSyntax(afterSplit);
      const clauses = cleanAfter.split(/[。；;\n]/).map((c) => c.trim()).filter((c) => c.length >= 6);
      if (clauses.length > 0) {
        deliverable = clauses.slice(0, 2).join('；');
      } else if (cleanAfter.length >= 6) {
        deliverable = cleanAfter;
      }
    }

    if (!deliverable) {
      const allClauses = cleanBefore.split(/[，,。；;]/).map((c) => c.trim()).filter((c) => c.length >= 6);
      if (allClauses.length >= 2) {
        if (!scenario) scenario = allClauses[0];
        deliverable = allClauses.slice(1).join('，');
      } else {
        deliverable = '输出符合工业标准且具确定性的结构化执行方案';
      }
    }
  }

  // 策略 C: 从正文有效行补充
  if (!scenario || !deliverable) {
    const validLines = rawContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('---'));
    if (!scenario) {
      scenario = cleanPainPrefix(cleanRawSyntax(validLines[0] || '复杂工程场景定向推理与质量审查'));
    }
    if (!deliverable) {
      deliverable = cleanRawSyntax(validLines[1] || '输出标准化分析报告与补丁代码');
    }
  }

  // 二次安全清洗与默认保底
  scenario = cleanPainPrefix(cleanRawSyntax(scenario));
  deliverable = cleanRawSyntax(deliverable);

  if (!scenario || scenario.length < 5) {
    scenario = '复杂工程场景定向推理与规范审查';
  }
  if (!deliverable || deliverable.length < 5) {
    deliverable = '输出符合工业标准的结构化交付成果与改进方案';
  }

  // 截断控制在适度长度（约 45 字），保持卡片视觉整齐
  if (scenario.length > 46) scenario = scenario.slice(0, 44) + '...';
  if (deliverable.length > 46) deliverable = deliverable.slice(0, 44) + '...';

  // 代码预览片段清洗：剥离前置样板头，直击核心判定规则
  const contentLines = rawContent.split('\n');
  const meaningfulLines = contentLines
    .map((l) => l.trimEnd())
    .filter((line) => {
      const l = line.trim();
      return (
        l &&
        !l.startsWith('# Role') &&
        !l.startsWith('## Profile') &&
        !l.startsWith('## 1. Role') &&
        !l.startsWith('---')
      );
    });

  const cleanCodeSnippet =
    meaningfulLines.length > 0
      ? meaningfulLines.slice(0, 5).join('\n')
      : rawContent.slice(0, 160);

  return {
    scenario,
    deliverable,
    cleanCodeSnippet,
  };
}
