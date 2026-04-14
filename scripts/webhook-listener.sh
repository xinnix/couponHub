#!/bin/bash
# Webhook 接收脚本
# 接收 GitHub Actions 触发并自动部署
# 使用方法：
#   1. 在服务器上运行此脚本作为 webhook listener
#   2. 使用 ngrok 或其他工具暴露到公网
#   3. 将 webhook URL 添加到 GitHub Secrets: PRODUCTION_DEPLOY_HOOK

set -e

PORT=8888
LOG_FILE="/var/log/deploy-webhook.log"

echo "========================================="
echo "  Production Deploy Webhook Listener"
echo "========================================="
echo ""
echo "Listening on port: $PORT"
echo "Log file: $LOG_FILE"
echo ""
echo "Webhook endpoint: http://your-server-ip:$PORT/deploy"
echo ""

# 创建简单的 HTTP server 接收 webhook
while true; do
    # 监听 HTTP 请求
    REQUEST=$(nc -l -p $PORT)

    # 检查是否是 POST /deploy 请求
    if echo "$REQUEST" | grep -q "POST /deploy"; then
        echo "$(date): Webhook received" >> "$LOG_FILE"

        # 提取 JSON body（简化处理）
        BODY=$(echo "$REQUEST" | sed -n '/{/,/}/p')

        # 解析参数（可选）
        IMAGE_TAG=$(echo "$BODY" | grep -o '"image_tag":"[^"]*"' | sed 's/"image_tag":"([^"]*)"/\1/' || echo "latest")
        REF=$(echo "$BODY" | grep -o '"ref":"[^"]*"' | sed 's/"ref":"([^"]*)"/\1/' || echo "unknown")

        echo "$(date): Image tag: $IMAGE_TAG, Ref: $REF" >> "$LOG_FILE"

        # 发送响应
        RESPONSE="HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\": \"deploying\", \"image_tag\": \"$IMAGE_TAG\", \"ref\": \"$REF\"}\r\n"
        echo "$RESPONSE" | nc -q 1 localhost $PORT &

        # 触发部署脚本
        echo "$(date): Starting deployment..." >> "$LOG_FILE"
        /Users/xinnix/code/coupon/scripts/server-deploy.sh >> "$LOG_FILE" 2>&1 &

        echo "$(date): Deployment started in background" >> "$LOG_FILE"
    else
        # 非 deploy 请求，返回 404
        RESPONSE="HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\nNot Found\r\n"
        echo "$RESPONSE" | nc -q 1 localhost $PORT &
    fi
done