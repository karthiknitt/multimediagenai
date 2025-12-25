#!/bin/bash
# ============================================================================
# Modal Deployment Script for AI Video Generation Backend
# ============================================================================
#
# This script deploys the new direct implementation backend to Modal.
# Run from WSL to avoid Windows Python encoding issues.
#
# Usage:
#   ./deploy.sh
#
# Prerequisites:
#   - Modal CLI installed (pip install modal)
#   - Modal account authenticated (modal token set)
#   - Modal secrets configured (see checklist below)
# ============================================================================

set -e  # Exit on error

echo "============================================================================"
echo "AI Video Generation Backend - Modal Deployment"
echo "Direct Implementation (No ComfyUI)"
echo "============================================================================"
echo ""

# ============================================================================
# Pre-Deployment Checks
# ============================================================================

echo "🔍 Running pre-deployment checks..."
echo ""

# Check if Modal CLI is installed
if ! command -v modal &> /dev/null; then
    echo "❌ ERROR: Modal CLI not found"
    echo "   Install with: pip install modal"
    exit 1
fi
echo "✅ Modal CLI installed: $(modal --version)"

# Check if authenticated (check for config file)
if [ ! -f ~/.modal.toml ]; then
    echo "❌ ERROR: Not authenticated with Modal"
    echo "   Run: modal token set"
    exit 1
fi
echo "✅ Modal authenticated"

# Check if secrets exist
echo ""
echo "🔐 Checking Modal secrets..."

SECRETS_OK=true

if ! modal secret list | grep -q "huggingface-secret"; then
    echo "⚠️  WARNING: 'huggingface-secret' not found"
    echo "   Create with: modal secret create huggingface-secret HF_TOKEN=<your-token>"
    SECRETS_OK=false
else
    echo "✅ huggingface-secret exists"
fi

if ! modal secret list | grep -q "r2-credentials"; then
    echo "⚠️  WARNING: 'r2-credentials' not found"
    echo "   Create with: modal secret create r2-credentials \\"
    echo "     R2_ACCESS_KEY_ID=<key> \\"
    echo "     R2_SECRET_ACCESS_KEY=<secret> \\"
    echo "     R2_BUCKET_NAME=<bucket> \\"
    echo "     R2_ACCOUNT_ID=<account-id>"
    SECRETS_OK=false
else
    echo "✅ r2-credentials exists"
fi

if ! modal secret list | grep -q "database-credentials"; then
    echo "⚠️  WARNING: 'database-credentials' not found"
    echo "   Create with: modal secret create database-credentials DATABASE_URL=<neon-url>"
    SECRETS_OK=false
else
    echo "✅ database-credentials exists"
fi

if [ "$SECRETS_OK" = false ]; then
    echo ""
    read -p "⚠️  Some secrets are missing. Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Check if volume exists
echo ""
echo "💾 Checking Modal volume..."
if ! modal volume list | grep -q "ai-models-volume"; then
    echo "⚠️  WARNING: 'ai-models-volume' not found"
    echo "   Volume will be created automatically on first deployment"
else
    echo "✅ ai-models-volume exists"
fi

# ============================================================================
# Deployment
# ============================================================================

echo ""
echo "============================================================================"
echo "🚀 Deploying to Modal..."
echo "============================================================================"
echo ""
echo "App name: ai-video-gen-direct"
echo "GPU: A100-80GB"
echo "Package manager: uv (fast!)"
echo ""

# Navigate to backend directory (handle both Windows and Linux paths)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📂 Working directory: $(pwd)"
echo ""

# Deploy using Modal CLI
echo "⏳ Deploying... (this may take 2-3 minutes)"
echo ""

modal deploy main.py

# ============================================================================
# Post-Deployment
# ============================================================================

echo ""
echo "============================================================================"
echo "✅ Deployment Complete!"
echo "============================================================================"
echo ""
echo "Your API is now live at:"
echo "https://<your-username>--ai-video-gen-direct-fastapi-app.modal.run"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Test health endpoint:"
echo "   curl https://<your-username>--ai-video-gen-direct-fastapi-app.modal.run/health"
echo ""
echo "2. Run the test script:"
echo "   ./test_endpoints.sh <your-api-url>"
echo ""
echo "3. Check Modal dashboard:"
echo "   https://modal.com/apps"
echo ""
echo "⚠️  Important Notes:"
echo ""
echo "• MusicGen model (~16GB) will download on first audio generation"
echo "• First requests may take longer due to cold starts (30-60s)"
echo "• Warm containers persist for 5 minutes (scaledown_window)"
echo "• Monitor costs at: https://modal.com/billing"
echo ""
echo "📖 API Documentation: See API_DOCS.md"
echo ""
echo "============================================================================"

# Optional: Get the deployed URL
echo ""
echo "🔍 Fetching deployed app URL..."
modal app list | grep "ai-video-gen-direct" || echo "Run 'modal app list' to see all apps"

echo ""
echo "Deployment script complete! 🎉"
echo ""
