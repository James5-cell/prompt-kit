// ID 生成工具

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateVersionNumber(previousVersion?: string): string {
  if (!previousVersion) {
    return '1.0.0';
  }
  const parts = previousVersion.split('.');
  const minor = parseInt(parts[1] || '0', 10) + 1;
  return `${parts[0]}.${minor}.0`;
}

