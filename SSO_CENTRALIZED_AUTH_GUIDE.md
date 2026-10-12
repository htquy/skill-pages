# 🔐 Centralized SSO & Entitlement Hub — Enterprise Integration Guide

Tài liệu hướng dẫn kỹ thuật chi tiết dành cho các kỹ sư xây dựng **Ứng dụng Native AOT / Desktop Windows (C#, C++, Rust, Tauri...)** và **Hệ thống Web vệ tinh (Next.js, Node.js, Python, SPA...)** tích hợp đăng nhập tập trung (Single Sign-On - SSO) và kiểm tra bản quyền / tính năng (Entitlements Hub).

---

## 1. TỔNG QUAN KIẾN TRÚC XÁC THỰC

Hệ thống xác thực trung tâm được xây dựng theo chuẩn công nghiệp **OAuth 2.0 (RFC 6749) + PKCE (RFC 7636) + OpenID Connect**:
- **Bắt buộc PKCE với thuật toán `S256`:** Tuyệt đối không chấp nhận `plain` code challenge nhằm ngăn chặn triệt để tấn công đánh chặn Authorization Code trên hệ điều hành và trình duyệt.
- **Hỗ trợ Loopback Dynamic Port (RFC 8252 §7.3):** Dành riêng cho Native Desktop Tool, cho phép mở cổng ngẫu nhiên `http://127.0.0.1:{port}/callback` mà không cần cấu hình cố định một port duy nhất.
- **CORS Preflight Enabled:** Hỗ trợ đầy đủ CORS cho các ứng dụng Web vệ tinh (SPA / Frontend riêng biệt) gọi trực tiếp đổi token.
- **Entitlements & Dynamic Menu Hub:** Tích hợp sẵn endpoint `/api/apps/{slug}/check-access` để kiểm tra gói cước (Free/VIP), ngày hết hạn, danh sách menu và tính năng được mở khóa.

---

## 2. BẢNG THÔNG TIN ENDPOINTS & CLIENT MẪU

> **Base URL:** `https://your-domain.com` (hoặc `http://localhost:3000` trên môi trường dev nội bộ).

### 2.1. Danh mục Endpoints

| Mục đích | Phương thức | Endpoint URL | Ghi chú |
| :--- | :--- | :--- | :--- |
| **OpenID Discovery** | `GET` | `/api/auth/oauth/.well-known/openid-configuration` | Tự động khám phá cấu hình OAuth |
| **Authorization** | `GET` | `/api/auth/oauth/authorize` | Mở trên trình duyệt người dùng |
| **Token Exchange** | `POST` | `/api/auth/oauth/token` | Đổi code lấy Access / Refresh token |
| **User Info** | `GET / POST`| `/api/auth/oauth/userinfo` | Lấy thông tin tài khoản (sub, name, email) |
| **Token Revocation** | `POST` | `/api/auth/oauth/revoke` | Thu hồi token khi Đăng xuất (Logout) |
| **Kiểm tra Bản quyền** | `GET` | `/api/apps/{slug}/check-access` | Kiểm tra VIP, hạn dùng, tính năng |
| **Menu Động theo Gói** | `GET` | `/api/apps/{slug}/menus` | Lấy cây menu phù hợp với gói user |

### 2.2. Danh sách Client ID mẫu có sẵn trong hệ thống

| Client ID | Loại Client | `client_secret` | Redirect URIs được phép | Sử dụng cho |
| :--- | :--- | :--- | :--- | :--- |
| `video-tool-desktop` | **Public** | *(Không có)* | `http://127.0.0.1/callback` *(Mọi port loopback)* | Desktop Tool Native AOT / Avalonia / C# |
| `demo-windows-tool` | **Public** | *(Không có)* | `http://127.0.0.1:8080/callback`, `https://oauth.pstmn.io/v1/callback` | Windows Tool cổng cố định / Postman |
| `demo-web-sso` | **Public / Conf** | *(Tùy chọn)* | `http://localhost:3000/api/auth/callback`, `https://app.example.com/callback` | Web vệ tinh / Sub-portal |

---

## 3. LUỒNG A: DÀNH CHO NATIVE AOT / WINDOWS DESKTOP APP

### 3.1. Nguyên lý Thiết kế (RFC 8252 — OAuth 2.0 for Native Apps)
1. **Tuyệt đối KHÔNG nhúng webview nội bộ để nhập mật khẩu:** Native App phải mở **Trình duyệt Mặc định của Hệ thống (System Default Browser)** như Edge, Chrome. Trình duyệt này lưu sẵn cookie Google/Session của người dùng, giúp đăng nhập 1 chạm an toàn và bảo mật mật khẩu.
2. **Public Client (Không dùng `client_secret`):** File `.exe` trên máy người dùng có thể bị decompile/reverse-engineer, do đó việc nhúng secret là vô nghĩa và vi phạm an toàn. Hệ thống dùng **PKCE (Proof Key for Code Exchange)** để đảm bảo chỉ chính instance native app đó mới đổi được token.
3. **Loopback Server:** App mở một `HttpListener` tạm thời trên `http://127.0.0.1:{random_port}/callback`. Sau khi nhận được Authorization Code, app tự đóng listener.

---

### 3.2. Sơ đồ tuần tự (Sequence Diagram)

```
+---------------+              +-----------------+              +--------------------+
|  Native Tool  |              | System Browser  |              | SSO Hub Server     |
| (Windows AOT) |              | (Edge / Chrome) |              | (skill-pages)      |
+---------------+              +-----------------+              +--------------------+
        |                               |                                  |
 1. Tạo code_verifier                   |                                  |
    & code_challenge (S256)             |                                  |
 2. Mở HttpListener:                    |                                  |
    127.0.0.1:{port}/callback           |                                  |
 3. Mở Browser ------------------------>|                                  |
                                 4. GET /api/auth/oauth/authorize -------->|
                                        |  (User đăng nhập / Đồng ý)       |
                                 5. 302 Redirect về:                       |
                                 <----- http://127.0.0.1:{port}/callback   |
        |<------------------------------|  (?code=XYZ&state=ABC)           |
 6. Đọc `code`, trả lời HTML            |                                  |
    "Đăng nhập xong, hãy đóng tab" ---->| (Tab hiển thị thành công)        |
 7. Đóng HttpListener                   |                                  |
        |                                                                  |
 8. POST /api/auth/oauth/token (code + code_verifier) -------------------->|
        |<-----------------------------------------------------------------|
        |  (Trả về: access_token, refresh_token, expires_in)               |
        |                                                                  |
 9. Lưu token an toàn vào Windows DPAPI                                    |
10. GET /api/apps/video-tool/check-access (Bearer access_token) ---------->|
        |<-----------------------------------------------------------------|
        |  (Trả về: isPaid: true, features, menus...)                      |
```

---

### 3.3. Mã nguồn C# .NET Native AOT Hoàn chỉnh (Production-Ready)

Mã nguồn dưới đây hoàn toàn tương thích với **.NET 8 / 9 Native AOT** (không dùng reflection, không dùng thư viện ngoài, compile ra file exe độc lập siêu nhẹ):

```csharp
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace NativeToolAuth;

public class SsoService
{
    private const string HUB_BASE_URL = "http://localhost:3000"; // Thay bằng domain chính thức
    private const string CLIENT_ID = "video-tool-desktop";
    private const string APP_SLUG = "video-tool";

    private static readonly HttpClient _httpClient = new HttpClient();

    // DTOs tối ưu cho Native AOT (Source Generated JSON)
    [JsonSerializable(typeof(TokenResult))]
    [JsonSerializable(typeof(EntitlementResult))]
    internal partial class AuthJsonContext : JsonSerializerContext { }

    public record TokenResult(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("refresh_token")] string RefreshToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn,
        [property: JsonPropertyName("token_type")] string TokenType
    );

    public record EntitlementResult(
        [property: JsonPropertyName("success")] bool Success,
        [property: JsonPropertyName("data")] EntitlementData Data
    );

    public record EntitlementData(
        [property: JsonPropertyName("isPaid")] bool IsPaid,
        [property: JsonPropertyName("hasActiveSubscription")] bool HasActiveSubscription,
        [property: JsonPropertyName("daysRemaining")] int DaysRemaining
    );

    /// <summary>
    /// Thực hiện luồng đăng nhập SSO tập trung qua Trình duyệt hệ thống
    /// </summary>
    public async Task<TokenResult> LoginAsync()
    {
        // 1. Tạo PKCE code_verifier và code_challenge (S256)
        string codeVerifier = GenerateCodeVerifier();
        string codeChallenge = GenerateCodeChallenge(codeVerifier);
        string state = Guid.NewGuid().ToString("N");

        // 2. Mở HttpListener với cổng ngẫu nhiên (Port = 0)
        using var listener = new HttpListener();
        int port = GetRandomUnusedPort();
        string redirectUri = $"http://127.0.0.1:{port}/callback";
        listener.Prefixes.Add($"http://127.0.0.1:{port}/");
        listener.Start();

        // 3. Xây dựng URL Authorize
        string authUrl = $"{HUB_BASE_URL}/api/auth/oauth/authorize?" +
            $"client_id={Uri.EscapeDataString(CLIENT_ID)}&" +
            $"redirect_uri={Uri.EscapeDataString(redirectUri)}&" +
            $"response_type=code&" +
            $"code_challenge={Uri.EscapeDataString(codeChallenge)}&" +
            $"code_challenge_method=S256&" +
            $"scope=openid%20profile%20email&" +
            $"state={state}";

        // 4. Mở trình duyệt mặc định hệ thống
        Process.Start(new ProcessStartInfo
        {
            FileName = authUrl,
            UseShellExecute = true
        });

        // 5. Chờ trình duyệt redirect callback về (Timeout sau 120s)
        var contextTask = listener.GetContextAsync();
        var timeoutTask = Task.Delay(TimeSpan.FromSeconds(120));
        var completedTask = await Task.WhenAny(contextTask, timeoutTask);

        if (completedTask == timeoutTask)
        {
            listener.Stop();
            throw new TimeoutException("Đăng nhập quá hạn. Người dùng không hoàn tất trên trình duyệt.");
        }

        var context = await contextTask;
        var request = context.Request;
        var query = request.QueryString;

        string? code = query["code"];
        string? returnedState = query["state"];
        string? error = query["error"];

        // Phản hồi trang HTML thân thiện để người dùng đóng tab
        string responseHtml = @"
            <!DOCTYPE html><html><head><meta charset='utf-8'><title>Đăng nhập thành công</title>
            <style>body{font-family:sans-serif;display:grid;place-items:center;min-height:90vh;background:#0f172a;color:#fff;}
            .box{background:#1e293b;padding:2rem;border-radius:12px;text-align:center;max-width:350px;}h2{color:#10b981;}</style>
            </head><body><div class='box'><h2>✓ Đăng nhập thành công!</h2>
            <p>Bạn có thể đóng tab trình duyệt này và quay lại ứng dụng.</p></div></body></html>";

        byte[] buffer = Encoding.UTF8.GetBytes(responseHtml);
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.ContentLength64 = buffer.Length;
        await context.Response.OutputStream.WriteAsync(buffer);
        context.Response.OutputStream.Close();
        listener.Stop();

        if (!string.IsNullOrEmpty(error))
            throw new InvalidOperationException($"Lỗi đăng nhập từ server: {error}");

        if (string.IsNullOrEmpty(code) || returnedState != state)
            throw new InvalidOperationException("Mã xác thực hoặc state không hợp lệ.");

        // 6. Gửi POST đổi code lấy Access Token (PKCE Exchange)
        var tokenRequest = new HttpRequestMessage(HttpMethod.Post, $"{HUB_BASE_URL}/api/auth/oauth/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["client_id"] = CLIENT_ID,
                ["code"] = code,
                ["redirect_uri"] = redirectUri,
                ["code_verifier"] = codeVerifier
            })
        };

        var response = await _httpClient.SendAsync(tokenRequest);
        string responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Đổi token thất bại: {responseBody}");

        var tokenData = JsonSerializer.Deserialize(responseBody, AuthJsonContext.Default.TokenResult);
        return tokenData ?? throw new JsonException("Không thể đọc phản hồi token.");
    }

    /// <summary>
    /// Kiểm tra gói bản quyền (VIP/Free) và danh sách tính năng
    /// </summary>
    public async Task<EntitlementResult> CheckEntitlementAsync(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{HUB_BASE_URL}/api/apps/{APP_SLUG}/check-access");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        string body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Kiểm tra bản quyền thất bại: {body}");

        return JsonSerializer.Deserialize(body, AuthJsonContext.Default.EntitlementResult)!;
    }

    // --- Helpers tạo PKCE ---
    private static string GenerateCodeVerifier()
    {
        byte[] bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Base64UrlEncode(bytes);
    }

    private static string GenerateCodeChallenge(string codeVerifier)
    {
        byte[] challengeBytes = SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier));
        return Base64UrlEncode(challengeBytes);
    }

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }

    private static int GetRandomUnusedPort()
    {
        var listener = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        int port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }
}
```

---

## 4. LUỒNG B: DÀNH CHO HỆ THỐNG WEB VỆ TINH (SATELLITE WEB APPS)

Đối với các ứng dụng Web vệ tinh muốn dùng chung tài khoản với Hub chính, có 2 kịch bản kiến trúc tùy theo bản chất của Web vệ tinh:

---

### Kịch bản B1: Web App có Server Backend riêng (Confidential Client — Khuyến nghị)
*Ví dụ: Web vệ tinh viết bằng Next.js, Node.js/Express, Python Django/FastAPI, Go, PHP...*

#### Thiết kế Hệ thống Vệ tinh:
1. **Đăng ký Client bí mật:** Cần liên hệ quản trị Hub để cấp `client_id` và `client_secret` (ví dụ: `client_id = "crm-web"`, `client_secret = "sec_..."`).
2. **Lưu Token an toàn:** Lưu `access_token` và `refresh_token` trong **HTTP-Only, Secure Cookie** hoặc Redis Session tại Backend vệ tinh (tuyệt đối không để lộ ra JavaScript frontend).
3. **Luồng thực thi:**
   - Người dùng bấm "Đăng nhập với Hub" trên Web vệ tinh -> Web vệ tinh redirect người dùng tới:
     ```
     GET https://hub.domain.com/api/auth/oauth/authorize?
       client_id=crm-web&
       redirect_uri=https://crm.domain.com/auth/callback&
       response_type=code&
       code_challenge=...&
       code_challenge_method=S256&
       scope=openid profile email
     ```
   - Hub chuyển hướng về `https://crm.domain.com/auth/callback?code=XYZ`.
   - Backend Web vệ tinh gửi `POST https://hub.domain.com/api/auth/oauth/token`:
     ```http
     POST /api/auth/oauth/token HTTP/1.1
     Host: hub.domain.com
     Content-Type: application/x-www-form-urlencoded

     grant_type=authorization_code
     &client_id=crm-web
     &client_secret=sec_...
     &code=XYZ
     &code_verifier=...
     &redirect_uri=https://crm.domain.com/auth/callback
     ```
   - Nhận Access Token, gọi `GET /api/auth/oauth/userinfo` để lấy thông tin Email, Tên, ID của User.

---

### Kịch bản B2: Web App SPA thuần (Single Page App — React, Vue, Vite, Next.js Client-side)
*Không có backend riêng, chạy 100% trong trình duyệt người dùng.*

#### Thiết kế Hệ thống Vệ tinh:
1. **Public Client (Không dùng `client_secret`):** Sử dụng Client ID công khai (như `demo-web-sso`).
2. **PKCE trên Trình duyệt:** Dùng Web Crypto API (`window.crypto.subtle`) để sinh `code_verifier` và `code_challenge`.
3. **CORS:** Trình duyệt sẽ gửi `POST /api/auth/oauth/token` trực tiếp. Hub đã cấu hình sẵn CORS headers nên request sẽ thành công 100%.

#### Code JavaScript/TypeScript Client-side cho SPA:

```typescript
// 1. Khởi tạo và chuyển hướng sang Hub
async function redirectToHubSSO() {
  const verifier = generateRandomString(64);
  sessionStorage.setItem("pkce_verifier", verifier);

  const challenge = await generateCodeChallenge(verifier);
  const state = generateRandomString(16);
  sessionStorage.setItem("oauth_state", state);

  const params = new URLSearchParams({
    client_id: "demo-web-sso",
    redirect_uri: window.location.origin + "/callback",
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    scope: "openid profile email",
    state: state,
  });

  window.location.href = `https://hub.domain.com/api/auth/oauth/authorize?${params.toString()}`;
}

// 2. Xử lý Callback tại trang /callback
async function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const state = urlParams.get("state");
  const savedState = sessionStorage.getItem("oauth_state");
  const codeVerifier = sessionStorage.getItem("pkce_verifier");

  if (!code || state !== savedState || !codeVerifier) {
    throw new Error("Xác thực không hợp lệ hoặc state không khớp");
  }

  // Gửi POST đổi token (Đã được Hub cho phép qua CORS)
  const response = await fetch("https://hub.domain.com/api/auth/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "demo-web-sso",
      code: code,
      redirect_uri: window.location.origin + "/callback",
      code_verifier: codeVerifier,
    }),
  });

  const tokens = await response.json(); // { access_token, refresh_token, expires_in }
  sessionStorage.setItem("access_token", tokens.access_token);
  sessionStorage.setItem("refresh_token", tokens.refresh_token);

  // Xóa các tạm thời
  sessionStorage.removeItem("pkce_verifier");
  sessionStorage.removeItem("oauth_state");

  window.location.href = "/dashboard";
}

// Helper sinh PKCE S256 bằng Web Crypto API
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
```

---

## 5. KIỂM TRA BẢN QUYỀN (ENTITLEMENTS HUB) & MENU ĐỘNG

Sau khi lấy được `access_token`, cả Native App và Web vệ tinh đều gọi về Hub để kiểm tra trạng thái kích hoạt và lấy menu phân quyền:

### 5.1. Endpoint: `GET /api/apps/{slug}/check-access`
Header: `Authorization: Bearer <access_token>`

#### Phản hồi thành công (`200 OK`):
```json
{
  "success": true,
  "data": {
    "isPaid": true,
    "hasActiveSubscription": true,
    "daysRemaining": 352,
    "plan": {
      "id": "plan-video-year",
      "name": "Video Tool 1 Năm",
      "interval": "YEAR"
    },
    "features": ["VIDEO_BATCH", "VIDEO_GPU", "VIDEO_NO_WATERMARK"],
    "menus": [
      { "id": "menu-video-trim", "label": "Cắt video", "path": "/trim", "access": "FREE" },
      { "id": "menu-video-batch", "label": "Xử lý hàng loạt", "path": "/batch", "access": "PAID" },
      { "id": "menu-video-gpu", "label": "Tăng tốc GPU", "path": "/gpu", "access": "PAID" }
    ]
  }
}
```

#### Phản hồi khi người dùng chưa mua gói:
```json
{
  "success": true,
  "data": {
    "isPaid": false,
    "hasActiveSubscription": false,
    "daysRemaining": 0,
    "features": [],
    "menus": [
      { "id": "menu-video-trim", "label": "Cắt video", "path": "/trim", "access": "FREE" }
    ]
  }
}
```

---

## 6. DANH SÁCH LỖI THƯỜNG GẶP & CÁCH KHẮC PHỤC

| Lỗi | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| `invalid_request: Only code_challenge_method=S256 is supported` | Client gửi `code_challenge_method=plain` hoặc không gửi | Bắt buộc hash SHA256 và truyền `code_challenge_method=S256`. |
| `Redirect URI is not allowed for this client` | Redirect URI không khớp danh sách đăng ký trong DB | Với Native App: đảm bảo scheme là `http:` và host là `127.0.0.1` hoặc `localhost`. Với Web: phải trùng khớp 100% domain đã đăng ký. |
| `invalid_grant: PKCE verification failed` | `code_verifier` gửi lúc đổi token không khớp với `code_challenge` ban đầu | Kiểm tra lại logic hash Base64URL-SHA256 của client. |
| `invalid_token: Access token expired` | Access token hết hạn (mặc định sau 24 giờ) | Dùng `refresh_token` gửi lên `/api/auth/oauth/token` với `grant_type=refresh_token` để lấy Access Token mới. |
| `CORS Error trên Web vệ tinh` | Web vệ tinh gọi sai port hoặc không gửi preflight đúng | Endpoint đã mở CORS toàn phần (`*`). Kiểm tra lại URL gọi có đúng domain của Hub không. |
