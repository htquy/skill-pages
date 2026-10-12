# 🚀 AI Gateway Service — Developer Integration Guide

Tài liệu hướng dẫn tích hợp **AI Gateway Service** dành cho các ứng dụng nội bộ và hệ thống bên ngoài. Bạn chỉ cần làm theo tài liệu này để gọi API mà **không cần quan tâm đến mã nguồn hay kiến trúc backend nội bộ của Gateway**.

---

## 1. TỔNG QUAN HỆ THỐNG

**AI Gateway** là điểm truy cập tập trung duy nhất (Unified Facade) cho mọi tác vụ Trí tuệ Nhân tạo:
- **Chuẩn hóa Request/Response:** Không cần học cú pháp riêng của từng hãng (OpenAI, Gemini, Fal.ai, Luma, v.v.).
- **Tự động Xoay Key & Chống Rate-limit:** Tích hợp Circuit Breaker tự động chuyển sang key dự phòng khi dính lỗi 429/401.
- **Hỗ trợ 4 nhóm tác vụ cốt lõi:**
  1. **Text LLM Engine:** Hỗ trợ cả REST Request thông thường và **Server-Sent Events (SSE) Streaming**.
  2. **Image Gen Engine:** Xử lý qua Async Queue, trả về `taskId` ngay lập tức, hỗ trợ Polling hoặc Webhook Callback.
  3. **Video Gen Engine:** Xử lý các tác vụ render nặng (30s – 3 phút), tự động sao lưu kết quả lên CDN Storage và gửi Webhook.
  4. **Audio / TTS Engine:** Sinh giọng nói AI chất lượng cao trả về Audio Buffer Stream hoặc File MP3.

---

## 2. XÁC THỰC & HEADERS (AUTHENTICATION)

Mọi HTTP request gửi tới Gateway phải đính kèm khóa xác thực qua header:

| Header Name | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `X-API-KEY` | String | **Có** | Khóa API được cấp cho ứng dụng của bạn (Ví dụ: `sk_gateway_demo_123`). Hoặc dùng `Authorization: Bearer <key>`. |
| `Content-Type` | String | **Có** | `application/json` (cho các method POST). |
| `X-Provider-Key` | String | *Không* | **BYOK (Bring Your Own Key):** Nếu bạn muốn dùng API Key riêng của bạn trả chi phí thay vì dùng Key của Gateway. |

---

## 3. CHI TIẾT CÁC ENDPOINT API

> **Base URL:** `https://your-gateway-domain.com` (hoặc `http://localhost:3000` trên môi trường nội bộ/dev).

---

### 3.1. TEXT LLM ENGINE — Sinh văn bản & Chat

#### `POST /api/v1/ai/text/generate`

#### Tham số Request Body:
```json
{
  "provider": "openai",              // Tùy chọn: "openai" | "gemini" (Mặc định: "openai")
  "model": "gpt-4o-mini",            // Tùy chọn: "gpt-4o-mini", "gemini-2.5-flash", v.v.
  "messages": [                      // Bắt buộc: Danh sách tin nhắn hội thoại
    { "role": "system", "content": "Bạn là trợ lý ảo tài chính thông minh." },
    { "role": "user", "content": "Hãy tóm tắt 3 chỉ số tài chính cơ bản cho người mới." }
  ],
  "temperature": 0.7,                // Tùy chọn: 0.0 đến 2.0 (Mặc định: 0.7)
  "maxTokens": 1000,                 // Tùy chọn: Số token tối đa
  "stream": false                    // Tùy chọn: true để kích hoạt Server-Sent Events (SSE)
}
```

#### A. Phản hồi REST Đồng bộ (`stream: false`):
```json
{
  "id": "chatcmpl-9x123abc",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "content": "Dưới đây là 3 chỉ số tài chính cơ bản:\n1. P/E (Price-to-Earnings)...\n2. ROE...",
  "usage": {
    "promptTokens": 32,
    "completionTokens": 145,
    "totalTokens": 177
  },
  "finishReason": "stop",
  "executionTimeMs": 850
}
```

#### B. Phản hồi SSE Streaming (`stream: true`):
Header trả về: `Content-Type: text/event-stream; charset=utf-8`

Mỗi chunk nhận được có định dạng:
```text
data: {"id":"chunk-1","deltaText":"Dưới","isFinished":false}

data: {"id":"chunk-2","deltaText":" đây","isFinished":false}

data: {"id":"chunk-3","deltaText":" là 3 chỉ số...","isFinished":false}

data: [DONE]
```

---

### 3.2. IMAGE GEN ENGINE — Sinh ảnh AI (Bất đồng bộ)

#### `POST /api/v1/ai/image/generate`

Tác vụ sinh ảnh xử lý qua Async Queue. Gateway sẽ tiếp nhận yêu cầu, trả về `taskId` với mã `202 Accepted` ngay lập tức để ứng dụng của bạn không bị block connection.

#### Tham số Request Body:
```json
{
  "provider": "fal-ai",                          // Tùy chọn: "fal-ai" | "stability" (Mặc định: "fal-ai")
  "model": "flux/schnell",                       // Tùy chọn: "flux/schnell", "flux/dev"
  "prompt": "A futuristic city in 2050, cyberpunk aesthetic, neon lights, ultra realistic 8k",
  "aspectRatio": "16:9",                         // Tùy chọn: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
  "numImages": 1,                                // Số lượng ảnh (1-4)
  "callbackUrl": "https://my-app.com/api/ai-callback" // Tùy chọn: Webhook nhận kết quả khi render xong
}
```

#### Phản hồi ngay lập tức (`HTTP 202 Accepted`):
```json
{
  "taskId": "7b0a7c4e-f831-482a-bc9a-1c881c15f928",
  "status": "PENDING",
  "provider": "fal-ai",
  "model": "flux/schnell",
  "estimatedSeconds": 15,
  "createdAt": "2026-10-12T07:15:00.000Z"
}
```

---

### 3.3. VIDEO GEN ENGINE — Sinh Video AI (Heavy Task)

#### `POST /api/v1/ai/video/generate`

#### Tham số Request Body:
```json
{
  "provider": "luma",                            // "luma" | "runway" | "kling" (Mặc định: "luma")
  "model": "ray-2",                              // Model video
  "prompt": "A drone shot flying through a modern glass skyscraper at sunset",
  "imageUrl": "https://cdn.my-app.com/start-frame.jpg", // Tùy chọn: Dành cho Image-to-Video
  "aspectRatio": "16:9",
  "durationSeconds": 5,
  "callbackUrl": "https://my-app.com/api/ai-callback" // Khuyến nghị: URL Webhook nhận thông báo
}
```

#### Phản hồi ngay lập tức (`HTTP 202 Accepted`):
```json
{
  "taskId": "9a12c841-a391-44bb-a2fe-fbc43fbb1c22",
  "status": "PENDING",
  "provider": "luma",
  "model": "ray-2",
  "estimatedSeconds": 120,
  "createdAt": "2026-10-12T07:16:00.000Z"
}
```

---

### 3.4. AUDIO / TTS ENGINE — Chuyển văn bản thành giọng nói

#### `POST /api/v1/ai/audio/speech`

#### Tham số Request Body:
```json
{
  "provider": "openai-tts",     // "openai-tts" | "elevenlabs" | "edgetts"
  "model": "tts-1",
  "text": "Xin chào, chào mừng bạn đến với hệ thống giao dịch tự động.",
  "voice": "alloy",             // "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"
  "speed": 1.0,                 // 0.25 đến 4.0
  "format": "mp3"               // "mp3" | "wav" | "ogg" | "aac"
}
```

#### Phản hồi:
- Trực tiếp stream Binary Audio Buffer với header:
  - `Content-Type: audio/mpeg`
  - `Cache-Control: public, max-age=86400`
- Bạn có thể phát trực tiếp trên thẻ `<audio>` hoặc ghi ra file `.mp3`.

---

### 3.5. THĂM DÒ TRẠNG THÁI TASK (POLLING)

Dành cho hệ thống không thể nhận Webhook hoặc muốn kiểm tra trạng thái chủ động.

#### `GET /api/v1/ai/tasks/:taskId`

#### Ví dụ Phản hồi khi hoàn tất (`status: "COMPLETED"`):
```json
{
  "id": "7b0a7c4e-f831-482a-bc9a-1c881c15f928",
  "taskType": "IMAGE",
  "status": "COMPLETED",
  "provider": "fal-ai",
  "model": "flux/schnell",
  "outputResult": {
    "images": [
      {
        "url": "https://storage.gateway.dev/images/7b0a7c4e-f831-482a-bc9a-1c881c15f928_1.png",
        "width": 1344,
        "height": 768
      }
    ],
    "seed": 4210928
  },
  "executionTimeMs": 12450,
  "callbackStatus": "DELIVERED",
  "createdAt": "2026-10-12T07:15:00.000Z"
}
```

---

## 4. XÁC THỰC WEBHOOK CALLBACK TỪ GATEWAY

Khi tác vụ Image hoặc Video hoàn tất, Gateway sẽ tự động gửi HTTP `POST` đến `callbackUrl` của bạn.

### Headers gửi kèm Webhook:
```http
POST /api/ai-callback HTTP/1.1
Host: my-app.com
Content-Type: application/json
X-Gateway-Signature: sha256=a8f9c1b...
User-Agent: AIGateway-Webhook-Service/1.0
```

### Payload Webhook:
```json
{
  "taskId": "7b0a7c4e-f831-482a-bc9a-1c881c15f928",
  "status": "COMPLETED",
  "result": {
    "images": [
      { "url": "https://storage.gateway.dev/images/..." }
    ]
  },
  "executionTimeMs": 12450
}
```

### Cách xác thực chữ ký (Node.js & Python):

#### Node.js / TypeScript:
```typescript
import crypto from "node:crypto";

export function verifyGatewayWebhook(rawBody: string, signatureHeader: string, secretKey: string): boolean {
  const expectedSignature = "sha256=" + crypto
    .createHmac("sha256", secretKey)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );
}
```

#### Python:
```python
import hmac
import hashlib

def verify_gateway_webhook(raw_body: bytes, signature_header: str, secret_key: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret_key.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature_header, expected)
```

---

## 5. CHUẨN XỬ LÝ LỖI (RFC 7807 PROBLEM DETAILS)

Khi xảy ra lỗi, Gateway luôn trả về phản hồi chuẩn quốc tế **RFC 7807** với header `Content-Type: application/problem+json`:

```json
{
  "type": "https://api.gateway.dev/errors/rate-limit-exceeded",
  "title": "Client Rate Limit Exceeded",
  "status": 429,
  "detail": "Client exceeded limit of 60 requests per minute",
  "instance": "/api/v1/ai/text/generate",
  "code": "CLIENT_RATE_LIMIT_EXCEEDED",
  "timestamp": "2026-10-12T07:20:00.123Z"
}
```

### Bảng mã lỗi thường gặp:

| Mã HTTP | Thuộc tính `code` | Giải thích | Hướng xử lý |
| :--- | :--- | :--- | :--- |
| `401` | `UNAUTHORIZED_CLIENT` | Thiếu hoặc sai API Key | Kiểm tra header `X-API-KEY`. |
| `429` | `CLIENT_RATE_LIMIT_EXCEEDED` | Client gửi quá số request/phút | Giãn cách tần suất gửi request. |
| `503` | `ALL_KEYS_EXHAUSTED` | Tất cả key upstream đang bị phạt cooldown | Chờ 30-60 giây và thử lại. |
| `502` | `PROVIDER_UNAVAILABLE` | Lỗi từ nhà cung cấp AI gốc (OpenAI, Fal...) | Kiểm tra mạng hoặc đổi sang provider khác. |
| `404` | `TASK_NOT_FOUND` | Không tìm thấy taskId | Kiểm tra lại taskId truyền vào. |
| `400` | `VALIDATION_ERROR` | Dữ liệu request không đúng định dạng | Kiểm tra chi tiết trong `invalidParams`. |

---

## 6. CODE MẪU SẴN DÙNG (READY-TO-USE CODE SNIPPETS)

### 6.1. TypeScript / JavaScript (Node.js & Next.js)

```typescript
const GATEWAY_URL = process.env.AI_GATEWAY_URL || "https://your-gateway-domain.com";
const API_KEY = process.env.AI_GATEWAY_KEY || "sk_gateway_demo_123";

// 1. Text LLM Streaming
async function streamChat(prompt: string) {
  const response = await fetch(`${GATEWAY_URL}/api/v1/ai/text/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
    },
    body: JSON.stringify({
      provider: "openai",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`[${error.code}] ${error.detail}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ") && !line.includes("[DONE]")) {
        const payload = JSON.parse(line.replace("data: ", ""));
        process.stdout.write(payload.deltaText);
      }
    }
  }
}

// 2. Tạo tác vụ sinh ảnh bất đồng bộ
async function generateImage(prompt: string, callbackUrl?: string) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/ai/image/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
    },
    body: JSON.stringify({
      provider: "fal-ai",
      prompt,
      aspectRatio: "16:9",
      callbackUrl,
    }),
  });

  return await res.json(); // { taskId: "...", status: "PENDING" }
}
```

---

### 6.2. Python (Requests & SSE Streaming)

```python
import requests
import json

GATEWAY_URL = "https://your-gateway-domain.com"
API_KEY = "sk_gateway_demo_123"

headers = {
    "X-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

# 1. Gọi Text Chat thông thường
def ask_ai(prompt: str):
    payload = {
        "provider": "gemini",
        "messages": [{"role": "user", "content": prompt}],
        "stream": False
    }
    response = requests.post(f"{GATEWAY_URL}/api/v1/ai/text/generate", headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()
    return data["content"]

# 2. Text LLM Streaming
def stream_ai(prompt: str):
    payload = {
        "provider": "openai",
        "messages": [{"role": "user", "content": prompt}],
        "stream": True
    }
    response = requests.post(f"{GATEWAY_URL}/api/v1/ai/text/generate", headers=headers, json=payload, stream=True)
    
    for line in response.iter_lines():
        if line:
            decoded = line.decode('utf-8')
            if decoded.startswith("data: ") and "[DONE]" not in decoded:
                chunk = json.loads(decoded[6:])
                print(chunk.get("deltaText", ""), end="", flush=True)

# 3. Tạo tác vụ sinh ảnh và Polling
def generate_image_and_wait(prompt: str):
    # Bước 1: Tạo task
    res = requests.post(f"{GATEWAY_URL}/api/v1/ai/image/generate", headers=headers, json={
        "provider": "fal-ai",
        "prompt": prompt,
        "aspectRatio": "1:1"
    })
    task_id = res.json()["taskId"]
    print(f"Task created: {task_id}. Polling for result...")

    # Bước 2: Polling
    import time
    for _ in range(30):
        time.sleep(3)
        poll_res = requests.get(f"{GATEWAY_URL}/api/v1/ai/tasks/{task_id}", headers=headers).json()
        if poll_res["status"] == "COMPLETED":
            return poll_res["outputResult"]["images"]
        elif poll_res["status"] == "FAILED":
            raise Exception("Image generation failed")
            
    raise TimeoutError("Task polling timeout")
```

---

### 6.3. cURL (Dùng kiểm thử trực tiếp bằng Terminal)

```bash
# 1. Test Text Chat
curl -X POST "http://localhost:3000/api/v1/ai/text/generate" \
  -H "X-API-KEY: sk_gateway_demo_123" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Xin chào AI!"}]}'

# 2. Test Text Streaming
curl -X POST "http://localhost:3000/api/v1/ai/text/generate" \
  -H "X-API-KEY: sk_gateway_demo_123" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Đếm từ 1 đến 5"}], "stream": true}'

# 3. Test Tạo Image Task
curl -X POST "http://localhost:3000/api/v1/ai/image/generate" \
  -H "X-API-KEY: sk_gateway_demo_123" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A cute red panda wearing glasses reading a book, 3D render", "aspectRatio": "1:1"}'

# 4. Kiểm tra trạng thái Task
curl -X GET "http://localhost:3000/api/v1/ai/tasks/<YOUR_TASK_ID>" \
  -H "X-API-KEY: sk_gateway_demo_123"
```
