# HƯỚNG DẪN TÍCH HỢP CATALOG ỨNG DỤNG, BẢNG GIÁ & KIỂM TRA QUYỀN TRẢ PHÍ (APP CATALOG & ENTITLEMENT HUB)

> **Dành cho:** Nhà phát triển Desktop App (.NET Native AOT Windows Tool, Electron, Python Desktop) và Web App vệ tinh (Next.js, React, Vue, Svelte, Micro-frontends).  
> **Mục tiêu:** Cho phép các hệ thống vệ tinh bên ngoài:
> 1. Gọi API lấy danh mục ứng dụng, các gói đăng ký (`Subscription Plans`), chu kỳ cước và danh sách tính năng mở khóa (`Features`).
> 2. Gọi API xác thực quyền sử dụng chức năng trả phí (`Check Access` / `Entitlement Hub`) theo người dùng và theo tính năng cụ thể.
> 3. Lấy cây Menu động phân quyền theo trạng thái gói cước.
> 4. Tích hợp luồng nâng cấp/thanh toán gói cước tự động (VietQR / Chuyển khoản ngân hàng tự động).

---

## 1. TỔNG QUAN KIẾN TRÚC HUB & SATELLITE (MODULAR MONOLITH)

```
                       ┌────────────────────────────────────────────────────────┐
                       │               CENTRAL MONOLITH HUB                     │
                       │           (https://hub.yourdomain.com)                 │
                       │                                                        │
                       │  - PostgreSQL Multi-Schema (apps, payment, auth)       │
                       │  - SSO OAuth2 PKCE Provider (/api/auth/oauth/*)        │
                       │  - Catalog & Pricing Service (/api/apps/*)             │
                       │  - Entitlement & Menus Service (/api/apps/:slug/*)     │
                       │  - SePay / VietQR Auto Activation Engine               │
                       └───────────────────▲─────────────────▲──────────────────┘
                                           │                 │
                  CORS / Bearer Token / PKCE                 │ Bearer Token / Secret
                                           │                 │
                ┌──────────────────────────┴────┐       ┌────┴──────────────────────────┐
                │       WEB SATELLITE APP       │       │    NATIVE WINDOWS TOOL        │
                │ (React / Next.js / Vue SPA)   │       │   (C# .NET 8/9 Native AOT)    │
                │                               │       │                               │
                │ - Render Bảng giá từ API Hub  │       │ - Đăng nhập SSO OAuth2 PKCE   │
                │ - Render Menu động theo quyền │       │ - Check quyền trước khi chạy  │
                │ - Nút "Nâng cấp gói"          │       │ - Mở trình duyệt nạp gói      │
                └───────────────────────────────┘       └───────────────────────────────┘
```

### Nguyên tắc thiết kế (Architectural Rules)
1. **Single Source of Truth về Gói cước & Quyền hạn:** Hệ thống vệ tinh **không tự lưu CSDL phân quyền cục bộ**. Mọi quyết định xem user có được dùng app, còn bao nhiêu ngày, có quyền dùng feature X (ví dụ `AI_VOICE_CLONE`, `EXPORT_4K`, `BATCH_PROCESSING`) đều được truy vấn tập trung qua Hub.
2. **CORS Full Support:** Toàn bộ API public và entitlement đều được cấu hình CORS mở (`Access-Control-Allow-Origin: *`, `Allow-Methods: GET, POST, OPTIONS`), hỗ trợ gọi trực tiếp từ Web Client chạy ở bất kỳ domain nào.
3. **Multi-Platform Auth:** Hỗ trợ Bearer Token (OAuth2 Access Token), Cookie Session (Web chung domain), và Server-to-Server (`x-internal-secret`).

---

## 2. DANH SÁCH RESTful API DÀNH CHO HỆ THỐNG VỆ TINH

Mọi endpoint đều sử dụng Base URL của Central Hub: `https://hub.yourdomain.com` (hoặc `http://localhost:3000` khi phát triển local).

### 2.1. Lấy Danh Sách Toàn Bộ Ứng Dụng & Bảng Giá (`GET /api/apps`)
- **Mục đích:** Hệ thống vệ tinh hoặc trang chủ có thể lấy danh mục tất cả ứng dụng đang hoạt động (`ACTIVE`) cùng các gói cước (`plans`) và tính năng đi kèm.
- **Yêu cầu xác thực:** Không (Public API).
- **CORS:** Đã bật sẵn (Hỗ trợ trình duyệt gọi trực tiếp).

#### Request:
```http
GET /api/apps HTTP/1.1
Host: hub.yourdomain.com
Accept: application/json
```

#### Response (`200 OK`):
```json
{
  "data": [
    {
      "id": "e93ad712-4f32-45a8-9d5f-1498c8c4c798",
      "slug": "video-ai-studio",
      "name": "Video AI Studio Pro",
      "description": "Phần mềm tạo và biên tập video tự động bằng AI",
      "type": "DESKTOP_TOOL",
      "status": "ACTIVE",
      "createdAt": "2026-10-01T10:00:00.000Z",
      "updatedAt": "2026-10-05T12:00:00.000Z",
      "plans": [
        {
          "id": "plan_monthly_01",
          "appId": "e93ad712-4f32-45a8-9d5f-1498c8c4c798",
          "name": "Gói Tiêu Chuẩn 1 Tháng",
          "description": "Dành cho nhà sáng tạo nội dung cá nhân",
          "currency": "VND",
          "price": 199000,
          "interval": "MONTH",
          "durationDays": 30,
          "isActive": true,
          "featureKeys": [
            "VIDEO_GEN_720P",
            "VOICE_BASIC",
            "STANDARD_QUEUE"
          ],
          "features": [
            {
              "key": "VIDEO_GEN_720P",
              "name": "Xuất video HD 720p",
              "description": "Render video chuẩn HD không giới hạn"
            },
            {
              "key": "VOICE_BASIC",
              "name": "Giọng đọc cơ bản Edge-TTS",
              "description": "Hơn 50 giọng đọc tự nhiên đa ngôn ngữ"
            }
          ]
        },
        {
          "id": "plan_annual_02",
          "appId": "e93ad712-4f32-45a8-9d5f-1498c8c4c798",
          "name": "Gói Pro 1 Năm",
          "description": "Mở khóa toàn bộ tính năng cao cấp + Render GPU ưu tiên",
          "currency": "VND",
          "price": 1790000,
          "interval": "YEAR",
          "durationDays": 365,
          "isActive": true,
          "featureKeys": [
            "VIDEO_GEN_720P",
            "VIDEO_GEN_4K",
            "VOICE_CLONE_VIP",
            "PRIORITY_GPU_QUEUE"
          ],
          "features": [
            {
              "key": "VIDEO_GEN_4K",
              "name": "Xuất video Ultra HD 4K",
              "description": "Độ nét cao nhất dành cho YouTube / TVC"
            },
            {
              "key": "VOICE_CLONE_VIP",
              "name": "Voice Cloning ElevenLabs",
              "description": "Nhân bản giọng đọc chính chủ chuẩn xác 99%"
            }
          ]
        }
      ]
    }
  ]
}
```

---

### 2.2. Lấy Thông Tin 1 Ứng Dụng & Bảng Giá (`GET /api/apps/{slug}`)
- **Mục đích:** Ứng dụng vệ tinh lấy riêng cấu hình và các gói giá cước của chính ứng dụng đó theo `slug`.

#### Request:
```http
GET /api/apps/video-ai-studio HTTP/1.1
Host: hub.yourdomain.com
Accept: application/json
```

#### Response (`200 OK`):
```json
{
  "data": {
    "app": {
      "id": "e93ad712-4f32-45a8-9d5f-1498c8c4c798",
      "slug": "video-ai-studio",
      "name": "Video AI Studio Pro",
      "description": "Phần mềm tạo và biên tập video tự động bằng AI",
      "type": "DESKTOP_TOOL",
      "status": "ACTIVE"
    },
    "plans": [
      {
        "id": "plan_monthly_01",
        "name": "Gói Tiêu Chuẩn 1 Tháng",
        "currency": "VND",
        "price": 199000,
        "interval": "MONTH",
        "durationDays": 30,
        "featureKeys": ["VIDEO_GEN_720P", "VOICE_BASIC"],
        "features": [ ... ]
      }
    ]
  }
}
```

---

### 2.3. Kiểm Tra Quyền Sử Dụng Trả Phí (`GET /api/apps/{slug}/check-access` hoặc `/entitlement`)
- **Endpoint:** `GET /api/apps/:slug/check-access` (hoặc alias `GET /api/apps/:slug/entitlement`).
- **Mục đích:** Endpoint lõi quan trọng nhất để ứng dụng vệ tinh kiểm tra xem người dùng hiện tại:
  1. Đã đăng ký gói trả phí của ứng dụng này chưa? (`isPaid: true/false`).
  2. Gói cước còn hạn hay đã hết hạn? (`status: "ACTIVE" | "EXPIRED" | "NO_SUBSCRIPTION"`).
  3. Còn bao nhiêu ngày sử dụng? (`daysRemaining: number`, `isLifetime: boolean`).
  4. Có quyền sử dụng một tính năng cụ thể nào đó không? (Truyền query param `?feature=KEY` -> Nhận cờ `hasFeature: true/false`).
  5. Cây Menu động được phép truy cập của ứng dụng.

#### Các cách xác thực hợp lệ:
| Phương thức | Header / Query | Đối tượng sử dụng |
|---|---|---|
| **Bearer Token (Khuyến nghị)** | `Authorization: Bearer <oauth_access_token>` | Desktop App Native AOT, Web SPA, Mobile App sau khi login OAuth2 PKCE |
| **Session Cookie** | `Cookie: ...` | Web App cùng domain với Hub |
| **Server-to-Server Secret** | Header `x-internal-secret: <SECRET>` kèm query `?userId=<UUID>` | Backend vệ tinh kiểm tra quyền của user mà không cần user access token |

#### Trường hợp 1: Kiểm tra tổng quát trạng thái gói cước
```http
GET /api/apps/video-ai-studio/check-access HTTP/1.1
Host: hub.yourdomain.com
Authorization: Bearer def50200...
```

**Response khi ĐÃ MUA GÓI & CÒN HẠN (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "app": {
      "id": "e93ad712-4f32-45a8-9d5f-1498c8c4c798",
      "slug": "video-ai-studio",
      "name": "Video AI Studio Pro",
      "type": "DESKTOP_TOOL"
    },
    "user": {
      "id": "usr_9921448123",
      "email": "customer@example.com",
      "name": "Nguyễn Văn A"
    },
    "isPaid": true,
    "hasActiveSubscription": true,
    "status": "ACTIVE",
    "subscription": {
      "id": "sub_48892110",
      "planId": "plan_annual_02",
      "planName": "Gói Pro 1 Năm",
      "interval": "YEAR",
      "startsAt": "2026-10-01T00:00:00.000Z",
      "endsAt": "2027-10-01T00:00:00.000Z",
      "daysRemaining": 354,
      "isLifetime": false
    },
    "unlockedFeatures": [
      "VIDEO_GEN_720P",
      "VIDEO_GEN_4K",
      "VOICE_CLONE_VIP",
      "PRIORITY_GPU_QUEUE"
    ],
    "menus": [ ... ]
  }
}
```

**Response khi CHƯA MUA GÓI HOẶC ĐÃ HẾT HẠN (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "app": {
      "id": "e93ad712-4f32-45a8-9d5f-1498c8c4c798",
      "slug": "video-ai-studio",
      "name": "Video AI Studio Pro",
      "type": "DESKTOP_TOOL"
    },
    "user": {
      "id": "usr_9921448123",
      "email": "customer@example.com",
      "name": "Nguyễn Văn A"
    },
    "isPaid": false,
    "hasActiveSubscription": false,
    "status": "NO_SUBSCRIPTION",
    "subscription": null,
    "unlockedFeatures": [],
    "menus": [ ... ]
  }
}
```

#### Trường hợp 2: Kiểm tra nhanh 1 Tính năng cụ thể (Feature Gate Check)
Ứng dụng gửi kèm query `?feature=KEY`:
```http
GET /api/apps/video-ai-studio/check-access?feature=VIDEO_GEN_4K HTTP/1.1
Host: hub.yourdomain.com
Authorization: Bearer def50200...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isPaid": true,
    "hasActiveSubscription": true,
    "checkedFeature": "VIDEO_GEN_4K",
    "hasFeature": true,
    "subscription": {
      "planName": "Gói Pro 1 Năm",
      "daysRemaining": 354
    },
    "unlockedFeatures": [
      "VIDEO_GEN_720P",
      "VIDEO_GEN_4K",
      "VOICE_CLONE_VIP"
    ]
  }
}
```
> **Lợi ích:** Phía Client không cần phải duyệt vòng lặp mảng `unlockedFeatures`, chỉ cần kiểm tra trực tiếp `res.data.hasFeature === true`. Nếu `false`, hiển thị hộp thoại: *"Tính năng này chỉ có trên Gói Pro. Vui lòng nâng cấp!"*.

#### Trường hợp 3: Chưa xác thực (Chưa đăng nhập / Token hết hạn)
```json
// HTTP 401 Unauthorized
{
  "isPaid": false,
  "hasActiveSubscription": false,
  "hasFeature": false,
  "error": "UNAUTHENTICATED",
  "message": "User must be authenticated via Bearer token, session cookie, or userId query parameter"
}
```

---

### 2.4. Lấy Menu Động Theo Phân Quyền (`GET /api/apps/{slug}/menus`)
- **Mục đích:** Ứng dụng Web vệ tinh render thanh Sidebar / Menu điều hướng. API tự động đánh dấu mục nào user được phép bấm (`isAccessible: true`), mục nào bị khóa (`isLocked: true`, kèm `lockReason: "REQUIRE_SUBSCRIPTION" | "REQUIRE_FEATURE"`).

#### Request:
```http
GET /api/apps/video-ai-studio/menus HTTP/1.1
Host: hub.yourdomain.com
Authorization: Bearer def50200...
```

#### Response:
```json
{
  "data": {
    "appSlug": "video-ai-studio",
    "userId": "usr_9921448123",
    "isAuthenticated": true,
    "menus": [
      {
        "id": "menu_home",
        "label": "Trang chủ Dự án",
        "path": "/projects",
        "icon": "Home",
        "access": "FREE",
        "isAccessible": true,
        "isLocked": false,
        "children": []
      },
      {
        "id": "menu_voice_clone",
        "label": "Nhân bản Giọng nói AI",
        "path": "/voice-clone",
        "icon": "Mic",
        "access": "PAID",
        "requiredFeature": "VOICE_CLONE_VIP",
        "isAccessible": false,
        "isLocked": true,
        "lockReason": "REQUIRE_FEATURE",
        "children": []
      }
    ]
  }
}
```

---

## 3. LUỒNG MUA GÓI & THANH TOÁN (SUBSCRIPTION PURCHASE FLOW)

Để tối ưu trải nghiệm và đảm bảo bảo mật tài chính, hệ thống Hub đã tích hợp cổng thanh toán tự động (VietQR / SePay ngân hàng Việt Nam):

1. **Khách hàng bấm "Nâng cấp gói" trên Tool/Web vệ tinh:**
   - Ứng dụng vệ tinh gọi `GET /api/apps/{slug}` để lấy danh sách gói (`plans`).
   - Khách hàng chọn gói cước mong muốn (ví dụ gói 1 tháng `plan_monthly_01`).
2. **Chuyển hướng người dùng sang trang thanh toán:**
   - Ứng dụng mở trình duyệt tới trang thanh toán của Hub:
     ```
     https://hub.yourdomain.com/apps/{slug}/checkout?planId={planId}
     ```
   - Hub hiển thị mã VietQR động với đúng số tiền và nội dung chuyển khoản tự động.
3. **Kích hoạt tức thì (Auto-Fulfillment):**
   - Khi khách hàng chuyển tiền bằng Mobile Banking, SePay Webhook bắn sang Hub trong 1–3 giây.
   - Hub tự động đối soát, cập nhật `user_subscriptions` thành `ACTIVE`.
4. **Tool/Web vệ tinh nhận quyền mới:**
   - Khi khách hàng quay lại Tool và bấm nút *"Kiểm tra lại quyền"*, hoặc Tool định kỳ gọi `GET /api/apps/{slug}/check-access`, hệ thống trả về ngay lập tức `isPaid: true` cùng `unlockedFeatures` mới.

---

## 4. CODE MẪU TÍCH HỢP CHO NATIVE AOT WINDOWS TOOL (C# .NET)

Dưới đây là một Service Class hoàn chỉnh bằng C# .NET 8 / .NET 9 chuẩn Native AOT, an toàn bộ nhớ, không dùng Reflection phức tạp:

```csharp
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SatelliteClient.Services;

// DTO Models phù hợp cho AOT (JsonSourceGeneration)
public record AppCatalogResponse(
    [property: JsonPropertyName("data")] AppDetailData Data
);

public record AppDetailData(
    [property: JsonPropertyName("app")] AppInfo App,
    [property: JsonPropertyName("plans")] List<SubscriptionPlan> Plans
);

public record AppInfo(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("slug")] string Slug,
    [property: JsonPropertyName("name")] string Name
);

public record SubscriptionPlan(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("price")] int Price,
    [property: JsonPropertyName("currency")] string Currency,
    [property: JsonPropertyName("interval")] string Interval,
    [property: JsonPropertyName("durationDays")] int DurationDays,
    [property: JsonPropertyName("featureKeys")] List<string> FeatureKeys
);

public record EntitlementResponse(
    [property: JsonPropertyName("success")] bool Success,
    [property: JsonPropertyName("data")] EntitlementData? Data,
    [property: JsonPropertyName("error")] string? Error
);

public record EntitlementData(
    [property: JsonPropertyName("isPaid")] bool IsPaid,
    [property: JsonPropertyName("hasActiveSubscription")] bool HasActiveSubscription,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("hasFeature")] bool? HasFeature,
    [property: JsonPropertyName("checkedFeature")] string? CheckedFeature,
    [property: JsonPropertyName("subscription")] UserSubscriptionInfo? Subscription,
    [property: JsonPropertyName("unlockedFeatures")] List<string> UnlockedFeatures
);

public record UserSubscriptionInfo(
    [property: JsonPropertyName("planName")] string PlanName,
    [property: JsonPropertyName("daysRemaining")] int DaysRemaining,
    [property: JsonPropertyName("isLifetime")] bool IsLifetime
);

public class AppEntitlementClient
{
    private readonly HttpClient _httpClient;
    private readonly string _appSlug;
    private readonly string _hubBaseUrl;

    public AppEntitlementClient(string hubBaseUrl, string appSlug)
    {
        _hubBaseUrl = hubBaseUrl.TrimEnd('/');
        _appSlug = appSlug;
        _httpClient = new HttpClient { BaseAddress = new Uri(_hubBaseUrl) };
    }

    /// <summary>
    /// 1. Lấy danh sách gói cước và bảng giá hiện tại của App
    /// </summary>
    public async Task<List<SubscriptionPlan>> GetPricingPlansAsync()
    {
        var response = await _httpClient.GetFromJsonAsync<AppCatalogResponse>($"/api/apps/{_appSlug}");
        return response?.Data?.Plans ?? new List<SubscriptionPlan>();
    }

    /// <summary>
    /// 2. Kiểm tra xem người dùng hiện tại có bản quyền sử dụng không
    /// </summary>
    public async Task<EntitlementData?> CheckAccessAsync(string userAccessToken, string? featureKey = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, 
            string.IsNullOrEmpty(featureKey) 
                ? $"/api/apps/{_appSlug}/check-access" 
                : $"/api/apps/{_appSlug}/check-access?feature={featureKey}");

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userAccessToken);

        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var result = await response.Content.ReadFromJsonAsync<EntitlementResponse>();
        return result?.Data;
    }

    /// <summary>
    /// 3. Tiện ích chặn tính năng (Feature Guard)
    /// </summary>
    public async Task<bool> RequireFeatureAsync(string userAccessToken, string featureKey)
    {
        var entitlement = await CheckAccessAsync(userAccessToken, featureKey);
        if (entitlement == null || !entitlement.IsPaid)
        {
            return false;
        }

        return entitlement.HasFeature ?? entitlement.UnlockedFeatures.Contains(featureKey);
    }

    /// <summary>
    /// 4. Mở trang thanh toán nạp gói trên trình duyệt mặc định
    /// </summary>
    public void OpenUpgradeCheckoutPage(string? planId = null)
    {
        var url = string.IsNullOrEmpty(planId)
            ? $"{_hubBaseUrl}/apps/{_appSlug}"
            : $"{_hubBaseUrl}/apps/{_appSlug}/checkout?planId={planId}";

        Process.Start(new ProcessStartInfo
        {
            FileName = url,
            UseShellExecute = true
        });
    }
}
```

#### Ví dụ sử dụng trong C# Tool:
```csharp
var client = new AppEntitlementClient("https://hub.yourdomain.com", "video-ai-studio");

// Kiểm tra trước khi Render 4K
bool canExport4K = await client.RequireFeatureAsync(userToken, "VIDEO_GEN_4K");

if (!canExport4K)
{
    Console.WriteLine("⚠️ Tính năng Render 4K yêu cầu gói Pro!");
    client.OpenUpgradeCheckoutPage("plan_annual_02");
    return;
}

Console.WriteLine("✅ Xác thực thành công! Bắt đầu Render 4K...");
```

---

## 5. CODE MẪU TÍCH HỢP CHO WEB SATELLITE (TYPESCRIPT / REACT / NEXT.JS)

```typescript
// services/entitlement.service.ts

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.yourdomain.com";
const APP_SLUG = "video-ai-studio";

export interface PlanFeature {
  key: string;
  name: string;
  description: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "MONTH" | "QUARTER" | "YEAR" | "CUSTOM";
  durationDays: number;
  featureKeys: string[];
  features?: PlanFeature[];
}

export interface EntitlementInfo {
  isPaid: boolean;
  hasActiveSubscription: boolean;
  status: "ACTIVE" | "EXPIRED" | "NO_SUBSCRIPTION";
  subscription: {
    planName: string;
    daysRemaining: number;
    isLifetime: boolean;
    endsAt: string | null;
  } | null;
  unlockedFeatures: string[];
  hasFeature?: boolean;
}

// 1. Fetch bảng giá
export async function fetchAppPricing(): Promise<SubscriptionPlan[]> {
  const res = await fetch(`${HUB_URL}/api/apps/${APP_SLUG}`);
  if (!res.ok) throw new Error("Failed to load plans");
  const json = await res.json();
  return json.data.plans;
}

// 2. Check quyền sử dụng của user
export async function checkUserEntitlement(
  accessToken: string,
  featureKey?: string
): Promise<EntitlementInfo> {
  const url = new URL(`${HUB_URL}/api/apps/${APP_SLUG}/check-access`);
  if (featureKey) {
    url.searchParams.set("feature", featureKey);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    return {
      isPaid: false,
      hasActiveSubscription: false,
      status: "NO_SUBSCRIPTION",
      subscription: null,
      unlockedFeatures: [],
      hasFeature: false,
    };
  }

  const json = await res.json();
  return json.data;
}

// 3. Chuyển hướng tới trang thanh toán
export function redirectToCheckout(planId: string) {
  window.location.href = `${HUB_URL}/apps/${APP_SLUG}/checkout?planId=${planId}`;
}
```

---

## 6. DANH MỤC LỖI THƯỜNG GẶP & CÁCH KHẮC PHỤC

| Mã lỗi / Tình trạng | Nguyên nhân | Cách xử lý |
|---|---|---|
| **CORS policy error** | Trình duyệt gọi bị chặn do thiếu headers | Đảm bảo gọi đúng Base URL của Hub. Toàn bộ route `/api/apps/*` đã được trang bị sẵn `OPTIONS` preflight và `Access-Control-Allow-Origin: *`. |
| **HTTP 401 UNAUTHENTICATED** | Không gửi kèm Header hoặc Token hết hạn | Dùng `refresh_token` từ SSO để lấy `access_token` mới, sau đó thử lại request với `Authorization: Bearer <token>`. |
| **HTTP 404 App not found** | `slug` ứng dụng truyền sai | Kiểm tra chính xác `slug` của ứng dụng trong trang Admin hoặc qua `GET /api/apps`. |
| **`isPaid: false` dù đã thanh toán** | Giao dịch ngân hàng chưa đối soát xong | Đợi 3–5 giây để SePay Webhook đồng bộ; hoặc kiểm tra trạng thái đơn hàng trên Hub. |
