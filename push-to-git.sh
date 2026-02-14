#!/bin/bash

# Git push script for Task2 project
echo "🚀 Pushing code to git repository..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Not in a git repository. Please navigate to the project root."
    exit 1
fi

# Show current status
echo ""
echo "📊 Current git status:"
git status --short

# Get commit message
echo ""
echo "💬 Enter commit message (or press Enter for default):"
read -p "> " commitMessage

if [ -z "$commitMessage" ]; then
    commitMessage="chore: update code $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo ""
echo "📝 Committing with message: '$commitMessage'"

# Stage all changes
echo "📦 Staging changes..."
git add .

if [ $? -ne 0 ]; then
    echo "❌ Failed to stage changes"
    exit 1
fi

# Commit
echo "💾 Creating commit..."
git commit -m "$commitMessage"

if [ $? -ne 0 ]; then
    echo "⚠️ Commit failed (may be no changes to commit)"
fi

# Get current branch
branch=$(git rev-parse --abbrev-ref HEAD)

# Push to remote
echo "🔼 Pushing to remote ($branch branch)..."
git push origin "$branch"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to git! 🎉"
    echo "Branch: $branch"
else
    echo ""
    echo "❌ Failed to push to remote"
    exit 1
fi

# Show latest commits
echo ""
echo "📋 Latest commits:"
git log --oneline -5
