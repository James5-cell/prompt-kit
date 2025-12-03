# GitHub 上传指南

## ✅ 已完成

- ✅ Git 仓库已初始化
- ✅ 远程仓库已配置: `https://github.com/James5-cell/prompt-kit.git`
- ✅ 初始提交已创建（37 个文件）

## 📝 下一步：推送代码到 GitHub

### 方法 1: 在 GitHub 上先创建仓库（最简单）

1. **访问 GitHub 创建新仓库**
   - 打开: https://github.com/new
   - 仓库名称: `prompt-kit`
   - 描述: `专业的 Prompt 知识库和工作流工具`
   - 选择 Public 或 Private
   - ⚠️ **不要勾选** "Initialize this repository with a README"
   - 点击 "Create repository"

2. **推送代码**
   ```bash
   git push -u origin main
   ```

### 方法 2: 使用推送脚本

运行提供的脚本：
```bash
./push-to-github.sh
```

### 方法 3: 使用 SSH（如果已配置）

如果你已经配置了 SSH key：

```bash
# 切换到 SSH URL
git remote set-url origin git@github.com:James5-cell/prompt-kit.git

# 推送
git push -u origin main
```

### 方法 4: 使用 Personal Access Token

1. **创建 Token**
   - 访问: https://github.com/settings/tokens
   - 点击 "Generate new token" → "Generate new token (classic)"
   - 勾选 `repo` 权限
   - 生成并复制 token

2. **推送时使用 token**
   ```bash
   git push -u origin main
   # Username: James5-cell
   # Password: <粘贴你的 token>
   ```

## 🔍 验证

推送成功后，访问以下链接查看仓库：
https://github.com/James5-cell/prompt-kit

## 📋 当前状态

```bash
# 查看远程仓库
git remote -v

# 查看提交历史
git log --oneline

# 查看当前状态
git status
```

## ⚠️ 注意事项

- 数据库文件 (`db.sqlite`) 已被 `.gitignore` 排除
- Firebase 配置包含占位符，上传前请检查
- 如果推送时遇到认证问题，请使用上述方法之一

