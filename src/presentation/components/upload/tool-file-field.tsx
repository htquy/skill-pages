"use client";

import { useRef, useState } from "react";
import { CloudUpload, FileArchive, Loader2, X } from "lucide-react";
import type { Dict } from "@/src/lib/i18n/config";
import { formatSize } from "@/src/presentation/components/upload/format-size";
import { useR2Upload, type UploadState } from "@/src/presentation/components/upload/use-r2-upload";

const ACCEPTED_EXTENSIONS =
  ".zip,.gz,.tgz,.tar,.7z,.rar,.exe,.msi,.dmg,.pkg,.deb,.rpm,.AppImage,.js,.mjs,.cjs,.ts,.py,.sh,.ps1,.json,.yaml,.yml,.txt";

export interface ToolFileValue {
  url: string;
  name: string | null;
  size: number | null;
}

function statusMessage(state: UploadState, dict: Dict): string {
  if (state.status === "preparing") return dict.upload.preparing;
  if (state.status === "completing") return dict.upload.completing;
  if (state.status === "uploading") return `${dict.upload.uploading} ${state.progress}%`;
  return "";
}

function errorMessage(state: UploadState, dict: Dict): string {
  const code = state.error;
  if (!code) return "";
  if (code === "invalid-type") return dict.upload.tool.invalidType;
  if (code === "too-large") return dict.upload.tooLarge;
  if (code === "canceled") return dict.upload.canceled;
  if (code === "network-error") return dict.upload.failed;
  if (/not configured/i.test(code)) return dict.upload.notConfigured;
  return dict.upload.failed;
}

/**
 * Gói công cụ tải về (EXE/DMG/ZIP/script) nằm trên R2. Tên tệp và kích thước
 * được gửi kèm vì khoá đối tượng có tiền tố UUID nên không tự suy ra được.
 */
export function ToolFileField({
  defaultValue,
  label,
  hint,
  dict,
}: {
  defaultValue: ToolFileValue;
  label: string;
  hint: string;
  dict: Dict;
}) {
  const { state, upload, cancel } = useR2Upload("tool-file");
  const [file, setFile] = useState<ToolFileValue>(defaultValue);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy =
    state.status === "preparing" || state.status === "uploading" || state.status === "completing";
  const message = state.status === "error" ? errorMessage(state, dict) : statusMessage(state, dict);

  async function handleFile(selected: File) {
    const publicUrl = await upload(selected);
    if (publicUrl) setFile({ url: publicUrl, name: selected.name, size: selected.size });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        <span className="text-xs text-zinc-400">{hint}</span>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) void handleFile(dropped);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? "border-indigo-400 bg-indigo-50/60" : "border-zinc-200 bg-zinc-50/60"
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin text-indigo-600" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{message}</p>
            {state.status === "uploading" ? (
              <div className="h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-[width] duration-200"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
            ) : null}
            <button
              type="button"
              onClick={cancel}
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              {dict.upload.remove}
            </button>
          </>
        ) : (
          <>
            <CloudUpload className="size-5 text-zinc-400" aria-hidden="true" />
            <p className="text-sm text-zinc-600">
              {dict.upload.tool.dropzone}{" "}
              <span className="text-zinc-400">· {dict.upload.dropzoneHint}</span>
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              {file.url ? dict.upload.replace : dict.upload.dropzoneHint}
            </button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) void handleFile(selected);
            event.target.value = "";
          }}
        />
      </div>

      {message && state.status === "error" ? (
        <p className="text-xs text-red-600">{message}</p>
      ) : null}
      {state.status === "done" ? <p className="text-xs text-emerald-600">{dict.upload.success}</p> : null}

      <input type="hidden" name="fileUrl" value={file.url} />
      <input type="hidden" name="fileName" value={file.name ?? ""} />
      <input type="hidden" name="fileSize" value={file.size === null ? "" : String(file.size)} />

      {file.url ? (
        <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
            <FileArchive className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-700">{file.name ?? dict.upload.tool.attached}</p>
            <p className="truncate text-xs text-zinc-400">{file.url}</p>
            {file.size !== null ? (
              <p className="mt-0.5 text-xs text-zinc-400">
                {dict.upload.sizeHint.replace("{size}", formatSize(file.size))}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setFile({ url: "", name: null, size: null })}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-red-600"
            >
              <X className="size-3" aria-hidden="true" />
              {dict.upload.remove}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-400">{dict.upload.tool.empty}</p>
      )}
    </div>
  );
}
