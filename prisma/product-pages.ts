/**
 * Nội dung trang giới thiệu (/tools/<slug>) cho các app desktop tự phát hành.
 * Chỉ dùng thẻ mà `sanitizeRichText` cho phép: p, h2, h3, ul, ol, li, strong, em, a, blockquote, code, hr.
 * Media (video demo, ảnh bìa) được script `scripts/publish-product-pages.ts` upload lên R2 rồi ghi URL vào DB.
 */

export type ProductPage = {
  slug: string;
  appSlug: string;
  title: string;
  shortDescription: string;
  description: string;
  /** Tên file trong thư mục media truyền cho script publish (video demo + ảnh bìa). */
  media: { video: string; cover: string };
};

export const SKILLSTUDIO_PAGE: ProductPage = {
  slug: "skillstudio",
  appSlug: "skill-studio",
  title: "SkillStudio — Xưởng sáng tạo bằng AI Agent",
  shortDescription:
    "Chọn phong cách, điền brief, để Claude Code / Codex / Gemini CLI dựng landing page, OG image, slide và video trên máy bạn — có kiểm định kết quả, lưu phiên bản và chỉnh tiếp trong cùng phiên.",
  description: `
<p><strong>SkillStudio</strong> biến các agent CLI bạn đã cài (Claude Code, Codex, Gemini CLI) thành một xưởng sản xuất có giao diện: chọn <strong>Web, Image, Video hoặc Slides</strong> → chọn một trong hơn <strong>700 phong cách</strong> có ảnh/video mẫu → điền brief → app dựng workspace, cài đúng skill, điều khiển agent, theo dõi tiến độ trực tiếp và kiểm định kết quả trước khi giao cho bạn.</p>

<h2>Làm được gì</h2>
<ul>
  <li><strong>Web</strong> — landing page, portfolio, cửa hàng một trang, site cá nhân: xuất HTML chạy offline, xem trước ngay trong app.</li>
  <li><strong>Image</strong> — OG image, poster, banner, minh hoạ bài viết theo phong cách thương hiệu nổi tiếng.</li>
  <li><strong>Video</strong> — launch film, motion graphic, reel, kinetic type: agent viết spec và render MP4 trên máy.</li>
  <li><strong>Slides</strong> — pitch deck, báo cáo, bài giảng: HTML deck và PowerPoint <code>.pptx</code>.</li>
</ul>

<h2>Vì sao khác một khung chat</h2>
<ul>
  <li><strong>Kiểm định tự động</strong>: mỗi kết quả được kiểm tra (đúng loại file, kích thước, thời lượng, số slide…). Chưa đạt thì agent tự sửa một vòng trước khi báo bạn.</li>
  <li><strong>Phiên bản &amp; chỉnh tiếp</strong>: mỗi lượt lưu thành v1, v2, v3… Gõ “tiêu đề to hơn, nền xanh đậm” để chỉnh trong <em>cùng phiên</em> của agent, hoặc fork từ bất kỳ phiên bản nào.</li>
  <li><strong>An toàn theo mặc định</strong>: 3 mức quyền (An toàn / Tiêu chuẩn / Toàn quyền), agent chỉ làm trong thư mục job, xin quyền từng bước qua giao diện; API key mã hoá bằng Windows DPAPI và chỉ chuyển cho agent khi phong cách cần.</li>
  <li><strong>Chạy trên máy bạn</strong>: dùng tài khoản agent CLI của chính bạn, không qua máy chủ trung gian, file kết quả nằm trong thư mục của bạn.</li>
  <li><strong>Thư viện luôn mới</strong>: kho phong cách đồng bộ từ đám mây — mỗi lần mở app chỉ một yêu cầu nhỏ để kiểm tra, có cập nhật mới tải phần thay đổi; video mẫu tải khi bạn xem.</li>
  <li><strong>Tự động cập nhật</strong>: có bản mới là app báo ngay, tải nền, kiểm tra toàn vẹn rồi tự cài — bạn không phải tải lại thủ công.</li>
</ul>

<h2>Miễn phí và Pro</h2>
<p>Bản miễn phí: duyệt toàn bộ thư viện, dùng <strong>22 phong cách phổ biến</strong> miễn phí, giao việc theo mô tả tự do, chẩn đoán máy. Gói <strong>Pro</strong> mở:</p>
<ul>
  <li><strong>Phong cách Pro</strong> — toàn bộ phong cách trả phí cho Web, Image, Slides.</li>
  <li><strong>Video Studio</strong> — các phong cách video &amp; motion (launch film, reel, kinetic type).</li>
  <li><strong>Chỉnh sửa tiếp &amp; fork</strong> — vòng lặp tinh chỉnh trong cùng phiên agent và fork phiên bản.</li>
</ul>
<p>Đăng nhập trong app bằng tài khoản onedaybetter.online; mua hoặc gia hạn xong chỉ cần bấm “Làm mới”, không phải cài lại. Mất mạng vẫn dùng được gói đã xác nhận tối đa 7 ngày.</p>

<h2>Yêu cầu</h2>
<ul>
  <li>Windows 10/11 x64, Microsoft Edge WebView2 Runtime (có sẵn trên Windows 11).</li>
  <li>Ít nhất một agent CLI: <code>npm i -g @anthropic-ai/claude-code</code>, <code>@openai/codex</code> hoặc <code>@google/gemini-cli</code> — đăng nhập trong terminal của CLI đó.</li>
  <li>Phong cách video cần thêm Node.js 22+ và FFmpeg (app kiểm tra và báo thiếu trước khi chạy).</li>
</ul>

<h2>Giao diện tiếng Việt &amp; tiếng Anh</h2>
<p>Đổi ngôn ngữ trong Cài đặt → Chung; áp dụng cho toàn bộ giao diện và hộp thoại.</p>
`.trim(),
  media: { video: "skillstudio-demo.mp4", cover: "skillstudio-cover.png" },
};

export const DIRECTORCRAFT_PAGE: ProductPage = {
  slug: "directorcraft-studio",
  appSlug: "video-tool",
  title: "DirectorCraft Studio — Xưởng làm phim & motion 2D bằng AI",
  shortDescription:
    "Từ một brief ra video hoạt hình 2D hoàn chỉnh: AI viết kịch bản, phân cảnh, dựng và render MP4 ngay trên máy bạn — không cần API key, nội dung tiếng Việt, có cổng duyệt ở từng giai đoạn.",
  description: `
<p><strong>DirectorCraft Studio</strong> là ứng dụng Windows (NativeAOT, khởi động tức thì) để làm <strong>video hoạt hình 2D bằng AI</strong>. App gọi các CLI AI bạn đã cài và đăng nhập (OpenCode, Claude Code, Codex, Gemini CLI) để viết nội dung, rồi tự render bằng máy của bạn — <strong>không cần API key</strong>, không gửi dự án lên máy chủ.</p>

<h2>Cinema 2D — từ brief ra phim</h2>
<p>Nhập brief, bấm <strong>Tạo và tự chạy</strong>. Dự án đi qua 8 giai đoạn có cổng duyệt: nghiên cứu → đề xuất → kịch bản → phân cảnh → tư liệu → sản xuất → kiểm tra → xuất. Ở mỗi cổng bạn duyệt, sửa trực tiếp hoặc yêu cầu AI làm lại.</p>
<ul>
  <li>Lời đọc tiếng Việt tuỳ chọn (Piper, chạy offline).</li>
  <li>Hệ thống nhân vật nhất quán xuyên suốt phim.</li>
  <li>Tự kiểm tra video sau khi xuất và ghi công tư liệu tự động.</li>
</ul>

<h2>Motion Studio 2D — motion graphic theo mẫu</h2>
<p>13 mẫu dựng sẵn: chữ động, biểu đồ, bảng trắng, collage, giao diện sản phẩm, biến hình, tin nhắn, lời bài hát, pixel, cắt giấy, người que mực và <strong>nhân vật/MC</strong> với 9 nhân vật. AI viết nội dung tiếng Việt, bạn xem trước rồi xuất MP4; ghép nhiều đoạn thành một phim có chuyển cảnh và nhạc nền.</p>

<h2>Auto-Clip Shorts &amp; công cụ hậu kỳ</h2>
<p>Tự cắt video dài thành shorts dọc, cùng bộ công cụ cắt / nén / ghép video quen thuộc.</p>

<h2>Agent &amp; thư viện</h2>
<ul>
  <li><strong>Agent</strong>: phát hiện CLI đã cài, quản lý nhiều tài khoản cho mỗi CLI, chạy lệnh cấu hình (/login, /status…). App không đọc hay lưu thông tin đăng nhập của CLI.</li>
  <li><strong>Thư viện</strong>: mọi dự án Motion và Cinema ở một chỗ, kho logo / ảnh / nhạc có giấy phép dùng lại cho nhiều video.</li>
</ul>

<h2>Miễn phí và Pro</h2>
<p>Miễn phí: công cụ hậu kỳ, thư viện, cấu hình agent. Gói <strong>Pro</strong> mở <strong>Cinema 2D</strong>, <strong>Motion Studio 2D</strong> và <strong>Auto-Clip Shorts</strong>. Đăng nhập trong app (menu Tài khoản) bằng tài khoản onedaybetter.online; mất mạng vẫn dùng được gói đã xác nhận tối đa 7 ngày.</p>

<h2>Yêu cầu</h2>
<ul>
  <li>Windows 10/11 x64, Microsoft Edge (render hoạt hình bằng Edge headless), FFmpeg (app tự tìm).</li>
  <li>Ít nhất một CLI AI đã đăng nhập: OpenCode, Claude Code, Codex hoặc Gemini CLI.</li>
</ul>
`.trim(),
  media: { video: "directorcraft-demo.mp4", cover: "directorcraft-cover.png" },
};

export const PRODUCT_PAGES = [SKILLSTUDIO_PAGE, DIRECTORCRAFT_PAGE];
