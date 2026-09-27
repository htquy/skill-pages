import { ORDER_CODE_MAX_LENGTH } from "@/src/domain/orders";
import { toMajorUnits } from "@/src/domain/shared";

export interface VietQrParams {
  /** Mã BIN (970418...) hoặc tên ngắn (BIDV, ICB, VCB, MB...) */
  bankCode: string;
  /** Số tài khoản người nhận (Tối đa 19 ký tự, hỗ trợ Alias / Virtual Account) */
  accountNumber: string;
  /** Tên chủ tài khoản người nhận (Tối đa 50 ký tự) */
  accountName: string;
  /** Số tiền chuyển khoản (Số dương, tối đa 13 chữ số) */
  amountMajor: number;
  /** Nội dung chuyển khoản / Mã đơn hàng (Tối đa 50 chữ cái không dấu) */
  addInfo: string;
  /** Mẫu template trình bày VietQR */
  template?: "compact2" | "compact" | "qr_only" | "print" | "loax";
}

export interface VietQrApiResponse {
  code: string;
  desc: string;
  data?: {
    qrCode: string;
    qrDataURL: string;
  };
}

const MAX_ACCOUNT_NAME = 50;

/**
 * 1. Dựng QuickLink VietQR chính thức (dạng URL trực tiếp):
 * Cú pháp: https://img.vietqr.io/image/<bankCode>-<accountNumber>-<template>.png?amount=<amount>&addInfo=<addInfo>&accountName=<accountName>
 */
export function buildVietQrImageUrl(params: VietQrParams): string {
  const bank = encodeURIComponent(params.bankCode);
  const account = encodeURIComponent(params.accountNumber);
  const template = params.template ?? "compact2";

  const url = new URL(`https://img.vietqr.io/image/${bank}-${account}-${template}.png`);
  url.searchParams.set("amount", String(params.amountMajor));
  url.searchParams.set("addInfo", params.addInfo.slice(0, ORDER_CODE_MAX_LENGTH));
  url.searchParams.set("accountName", params.accountName.slice(0, MAX_ACCOUNT_NAME));

  return url.toString();
}

/**
 * 2. Gọi trực tiếp REST API VietQR (v2/generate):
 * Endpoint: https://api.vietqr.io/v2/generate
 */
export async function fetchVietQrApi(params: VietQrParams): Promise<VietQrApiResponse | null> {
  try {
    const response = await fetch("https://api.vietqr.io/v2/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountNo: params.accountNumber,
        accountName: params.accountName.slice(0, MAX_ACCOUNT_NAME),
        acqId: params.bankCode,
        amount: params.amountMajor,
        addInfo: params.addInfo.slice(0, ORDER_CODE_MAX_LENGTH),
        template: params.template ?? "compact2",
      }),
    });

    if (!response.ok) return null;
    return (await response.json()) as VietQrApiResponse;
  } catch {
    return null;
  }
}

/**
 * 3. Lấy thẳng dữ liệu hình ảnh (Base64 Data URL):
 * Tải trực tiếp dữ liệu ảnh binary từ VietQR ở server và đóng gói thành `data:image/png;base64,...`
 */
export async function fetchVietQrDataUrl(params: VietQrParams): Promise<string> {
  // Ưu tiên 1: Lấy qrDataURL từ API POST https://api.vietqr.io/v2/generate
  const apiResult = await fetchVietQrApi(params);
  if (apiResult?.data?.qrDataURL) {
    return apiResult.data.qrDataURL;
  }

  // Ưu tiên 2: Tải trực tiếp file ảnh từ QuickLink URL và mã hóa thành Base64 Data URL
  try {
    const imageUrl = buildVietQrImageUrl(params);
    const response = await fetch(imageUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/png";
      return `data:${contentType};base64,${base64}`;
    }
  } catch {
    // ignore
  }

  return buildVietQrImageUrl(params);
}

/** Legacy helper tương thích ngược */
export function buildVietQrUrl(endpoint: string, params: VietQrParams): string {
  if (endpoint.includes("img.vietqr.io")) {
    return buildVietQrImageUrl(params);
  }
  const url = new URL(endpoint);
  url.searchParams.set("accountNumber", params.accountNumber);
  url.searchParams.set("accountName", params.accountName.slice(0, MAX_ACCOUNT_NAME));
  url.searchParams.set("bank", params.bankCode);
  url.searchParams.set("amount", String(params.amountMajor));
  url.searchParams.set("addInfo", params.addInfo.slice(0, ORDER_CODE_MAX_LENGTH));
  url.searchParams.set("template", params.template ?? "compact2");
  return url.toString();
}

/** Số tiền sẽ hiển thị/khoá trong QR, quy đổi từ giá trị lưu trong database. */
export function toQrAmount(amountMinor: number, currency: string): number {
  return toMajorUnits(amountMinor, currency);
}

