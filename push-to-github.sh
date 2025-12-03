#!/bin/bash

# 推送到 GitHub 的脚本

echo "═══════════════════════════════════════════════════════════"
echo "  准备推送到 GitHub..."
echo "═══════════════════════════════════════════════════════════"
echo ""

# 检查远程仓库是否已配置
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ 远程仓库未配置"
    exit 1
fi

echo "✅ 远程仓库: $(git remote get-url origin)"
echo "✅ 当前分支: $(git branch --show-current)"
echo ""

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  检测到未提交的更改，是否要提交？(y/n)"
    read -r response
    if [ "$response" = "y" ]; then
        git add .
        git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
fi

echo ""
echo "正在推送到 GitHub..."
echo ""

# 尝试推送
if git push -u origin main; then
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  ✅ 推送成功！"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "查看仓库: https://github.com/James5-cell/prompt-kit"
else
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  ❌ 推送失败"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "可能的原因："
    echo "1. GitHub 仓库尚未创建"
    echo "   请先访问: https://github.com/new"
    echo "   创建名为 'prompt-kit' 的仓库"
    echo ""
    echo "2. 需要身份验证"
    echo "   使用 SSH: git remote set-url origin git@github.com:James5-cell/prompt-kit.git"
    echo "   或使用 Personal Access Token"
    echo ""
fi

