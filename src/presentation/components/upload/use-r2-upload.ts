"use client";

import { useCallback, useRef, useState } from "react";

const MULTIPART_THRESHOLD_BYTES = 50 * 1024 * 1024;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

/** Phải khớp `R2_ALLOWED_CONTENT_TYPES` ở src/lib/validation.ts. */
const MEDIA_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/** Phải khớp `R2_ALLOWED_TOOL_FILE_CONTENT_TYPES` ở src/lib/validation.ts. */
const TOOL_FILE_CONTENT_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/gzip",
  "application/x-gzip",
  "application/x-tar",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-msdownload",
  "application/vnd.microsoft.portable-executable",
  "application/x-msi",
  "application/x-executable",
  "application/x-apple-diskimage",
  "application/vnd.apple.installer+xml",
  "application/x-debian-package",
  "application/vnd.debian.binary-package",
  "application/x-rpm",
  "application/javascript",
  "text/javascript",
  "application/x-sh",
  "text/x-python",
  "text/x-shellscript",
  "application/json",
  "text/yaml",
  "text/plain",
  "application/octet-stream",
];

const TOOL_FILE_EXTENSIONS = [
  "zip", "gz", "tgz", "tar", "7z", "rar",
  "exe", "msi", "dmg", "pkg", "deb", "rpm", "appimage",
  "js", "mjs", "cjs", "ts", "py", "sh", "ps1",
  "json", "yaml", "yml", "txt",
];

export type UploadKind = "media" | "tool-file";

const ALLOWED_CONTENT_TYPES: Record<UploadKind, string[]> = {
  media: MEDIA_CONTENT_TYPES,
  "tool-file": TOOL_FILE_CONTENT_TYPES,
};

/** Tệp nhị phân không tin content-type nên kiểm tra thêm phần mở rộng. */
function hasAllowedExtension(fileName: string): boolean {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName.trim());
  return match ? TOOL_FILE_EXTENSIONS.includes(match[1].toLowerCase()) : false;
}

export type UploadStatus = "idle" | "preparing" | "uploading" | "completing" | "done" | "error";

export type UploadState = {
  status: UploadStatus;
  progress: number;
  error: string | null;
  publicUrl: string | null;
};

const INITIAL_STATE: UploadState = { status: "idle", progress: 0, error: null, publicUrl: null };

type PresignResponse = { url: string; publicUrl: string };
type MultipartInitResponse = {
  key: string;
  uploadId: string;
  partSize: number;
  parts: { partNumber: number; url: string }[];
};
type MultipartCompleteResponse = { publicUrl: string };

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error) return body.error;
  } catch {
    /* response không phải JSON */
  }
  return fallback;
}

/** PUT bằng XHR vì `fetch` không theo dõi được tiến độ upload. */
function putWithProgress(input: {
  url: string;
  body: Blob;
  contentType: string;
  register: (xhr: XMLHttpRequest | null) => void;
  onProgress: (loaded: number) => void;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", input.url, true);
    xhr.setRequestHeader("Content-Type", input.contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) input.onProgress(event.loaded);
    };
    xhr.onload = () => {
      input.register(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        input.onProgress(input.body.size);
        // R2/S3 trả ETag qua header, cần CORS expose header này.
        resolve(xhr.getResponseHeader("ETag") ?? "");
      } else {
        reject(new Error(`upload-failed-${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      input.register(null);
      reject(new Error("network-error"));
    };
    xhr.onabort = () => {
      input.register(null);
      reject(new Error("canceled"));
    };
    input.register(xhr);
    xhr.send(input.body);
  });
}

export function useR2Upload(kind: UploadKind = "media") {
  const [state, setState] = useState<UploadState>(INITIAL_STATE);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const canceledRef = useRef(false);

  const register = useCallback((xhr: XMLHttpRequest | null) => {
    xhrRef.current = xhr;
  }, []);

  const cancel = useCallback(() => {
    canceledRef.current = true;
    xhrRef.current?.abort();
    xhrRef.current = null;
    setState({ status: "idle", progress: 0, error: "canceled", publicUrl: null });
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      // Một số trình duyệt không gán MIME cho file nhị phân (dmg, AppImage, ps1…).
      const contentType = file.type || "application/octet-stream";
      if (!ALLOWED_CONTENT_TYPES[kind].includes(contentType)) {
        setState({ ...INITIAL_STATE, status: "error", error: "invalid-type" });
        return null;
      }
      if (kind === "tool-file" && !hasAllowedExtension(file.name)) {
        setState({ ...INITIAL_STATE, status: "error", error: "invalid-type" });
        return null;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setState({ ...INITIAL_STATE, status: "error", error: "too-large" });
        return null;
      }

      canceledRef.current = false;
      setState({ status: "preparing", progress: 0, error: null, publicUrl: null });

      try {
        if (file.size < MULTIPART_THRESHOLD_BYTES) {
          const response = await fetch("/api/upload/r2/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, fileName: file.name, contentType, size: file.size }),
          });
          if (!response.ok) throw new Error(await readError(response, "presign-failed"));
          const { url, publicUrl } = (await response.json()) as PresignResponse;

          setState((previous) => ({ ...previous, status: "uploading" }));
          await putWithProgress({
            url,
            body: file,
            contentType,
            register,
            onProgress: (loaded) => {
              setState((previous) => ({
                ...previous,
                progress: Math.min(99, Math.round((loaded / file.size) * 100)),
              }));
            },
          });

          setState({ status: "done", progress: 100, error: null, publicUrl });
          return publicUrl;
        }

        const initResponse = await fetch("/api/upload/r2/init-multipart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, fileName: file.name, contentType, size: file.size }),
        });
        if (!initResponse.ok) throw new Error(await readError(initResponse, "init-failed"));
        const { key, uploadId, partSize, parts } = (await initResponse.json()) as MultipartInitResponse;

        const uploaded: { partNumber: number; etag: string }[] = [];
        let completedBytes = 0;

        try {
          for (const part of parts) {
            if (canceledRef.current) throw new Error("canceled");
            const start = (part.partNumber - 1) * partSize;
            const chunk = file.slice(start, Math.min(start + partSize, file.size));
            const etag = await putWithProgress({
              url: part.url,
              body: chunk,
              contentType,
              register,
              onProgress: (loaded) => {
                setState((previous) => ({
                  ...previous,
                  status: "uploading",
                  progress: Math.min(99, Math.round(((completedBytes + loaded) / file.size) * 100)),
                }));
              },
            });
            completedBytes += chunk.size;
            uploaded.push({ partNumber: part.partNumber, etag: etag.replaceAll('"', "") });
          }

          setState((previous) => ({ ...previous, status: "completing" }));
          const completeResponse = await fetch("/api/upload/r2/complete-multipart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, uploadId, parts: uploaded }),
          });
          if (!completeResponse.ok) throw new Error(await readError(completeResponse, "complete-failed"));
          const { publicUrl } = (await completeResponse.json()) as MultipartCompleteResponse;

          setState({ status: "done", progress: 100, error: null, publicUrl });
          return publicUrl;
        } catch (error) {
          await fetch("/api/upload/r2/abort-multipart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, uploadId }),
          }).catch(() => undefined);
          throw error;
        }
      } catch (error) {
        const code = error instanceof Error ? error.message : "upload-failed";
        if (code === "canceled" || canceledRef.current) {
          setState({ status: "idle", progress: 0, error: "canceled", publicUrl: null });
          return null;
        }
        setState((previous) => ({ ...previous, status: "error", error: code }));
        return null;
      }
    },
    [kind, register],
  );

  return { state, upload, cancel, reset };
}
