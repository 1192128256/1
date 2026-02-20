#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-4173}"

echo "启动俄罗斯方块中..."
echo "请在浏览器打开: http://localhost:${PORT}"
python -m http.server "${PORT}" --directory "$(cd "$(dirname "$0")" && pwd)"
