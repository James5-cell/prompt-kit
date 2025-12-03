# 上传到 GitHub 的步骤

## 方法 1: 使用命令行（推荐）

1. 在 GitHub 上创建新仓库后，运行以下命令：

```bash
# 添加远程仓库（将 YOUR_USERNAME 替换为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/prompt-kit.git

# 或者使用 SSH（如果你配置了 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/prompt-kit.git

# 推送代码到 GitHub
git branch -M main
git push -u origin main
```

## 方法 2: 使用 GitHub CLI（如果已安装）

```bash
# 创建并推送仓库
gh repo create prompt-kit --public --source=. --remote=origin --push
```

## 注意事项

1. **Firebase 配置**: `src/storage/firebase.ts` 中包含占位符配置。如果包含敏感信息，请：
   - 使用环境变量存储配置
   - 或确保 `.gitignore` 正确配置

2. **数据库文件**: `db.sqlite` 已被 `.gitignore` 排除，不会上传

3. **环境变量**: 如果需要，可以创建 `.env.example` 文件作为模板

## 后续步骤

推送成功后，你可以：
- 在 GitHub 上查看代码
- 设置 GitHub Pages（如果需要）
- 添加 GitHub Actions 进行 CI/CD
- 邀请协作者

