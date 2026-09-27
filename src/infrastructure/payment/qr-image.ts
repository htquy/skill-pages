import QRCode from "qrcode";

/**
 * Dựng ảnh QR cục bộ (data URL) từ payload chuẩn của ngân hàng.
 *
 * Không phụ thuộc CDN của VietQR: nếu máy khách chặn api.vietqr.io thì QR vẫn
 * quét được. Ảnh do ngân hàng render (`qrImageUrl`) vẫn được trả về cho client
 * nếu muốn dùng template chính thức.
 */
export async function renderQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#18181b", light: "#ffffff" },
  });
}
