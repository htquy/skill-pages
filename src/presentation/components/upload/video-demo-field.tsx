"use client";

import { useRef, useState } from "react";
import { CloudUpload, Loader2, X } from "lucide-react";
import type { Dict } from "@/src/lib/i18n/config";
import { getVideoEmbedUrl, isDirectVideoUrl } from "@/src/lib/video";
import { TextInput } from "@/src/presentation/components/admin/form-field";
import { formatSize } from "@/src/presentation/components/upload/format-size";
import { useR2Upload, type UploadState } from "@/src/presentation/components/upload/use-r2-upload";

const ACCEPTED_EXTENSIONS = ".mp4,.webm,.mov,.mkv,.pdf";

function statusMessage(state: UploadState, dict: Dict): string {
  if (state.status === "preparing") return dict.upload.preparing;
  if (state.status === "completing") return dict.upload.completing;
  if (state.status === "uploading") return `${dict.upload.uploading} ${state.progress}%`;
  return "";
}

function errorMessage(state: UploadState, dict: Dict): string {
  const code = state.error;
  if (!code) return "";
  if (code === "invalid-type") return dict.upload.invalidType;
  if (code === "too-large") return dict.upload.tooLarge;
  if (code === "canceled") return dict.upload.canceled;
  if (code === "network-error") return dict.upload.failed;
  if (/not configured/i.test(code)) return dict.upload.notConfigured;
  return dict.upload.failed;
}

export function VideoDemoField({
  defaultValue,
  label,
  hint,
  dict,
}: {
  defaultValue: string;
  label: string;
  hint: string;
  dict: Dict;
}) {
  const { state, upload, cancel } = useR2Upload();
  const [value, setValue] = useState(defaultValue);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy =
    state.status === "preparing" || state.status === "uploading" || state.status === "completing";
  const preview = value || state.publicUrl || "";
  const videoEmbedUrl = getVideoEmbedUrl(preview);
  const videoFileUrl = isDirectVideoUrl(preview) ? preview : null;
  const message = state.status === "error" ? errorMessage(state, dict) : statusMessage(state, dict);

  async function handleFile(file: File) {
    setFileInfo({ name: file.name, size: file.size });
    const publicUrl = await upload(file);
    if (publicUrl) setValue(publicUrl);
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
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
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
              {dict.upload.dropzone} <span className="text-zinc-400">· {dict.upload.dropzoneHint}</span>
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              {dict.upload.replace}
            </button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {fileInfo && !busy ? (
        <p className="text-xs text-zinc-500">
          {fileInfo.name} · {dict.upload.sizeHint.replace("{size}", formatSize(fileInfo.size))}
        </p>
      ) : null}
      {message && state.status === "error" ? (
        <p className="text-xs text-red-600">{message}</p>
      ) : null}
      {state.status === "done" ? <p className="text-xs text-emerald-600">{dict.upload.success}</p> : null}

      <div>
        <TextInput
          name="videoDemoUrl"
          type="url"
          value={preview}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          maxLength={2000}
        />
        <p className="mt-1 text-xs text-zinc-400">{dict.upload.urlHint}</p>
      </div>

      {preview ? (
        <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3">
          {videoEmbedUrl ? (
            <iframe
              src={videoEmbedUrl}
              title={dict.upload.previewAlt}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-28 w-full rounded-lg border-0 bg-zinc-900"
            />
          ) : videoFileUrl ? (
            <video
              src={videoFileUrl}
              controls
              preload="metadata"
              className="h-28 w-full rounded-lg bg-zinc-900 object-contain"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-lg bg-zinc-100 text-[10px] font-semibold uppercase text-zinc-500">
              {/\.pdf(\?|$)/i.test(preview) ? "PDF" : "URL"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-zinc-500">{preview}</p>
            <button
              type="button"
              onClick={() => {
                setValue("");
                setFileInfo(null);
              }}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-red-600"
            >
              <X className="size-3" aria-hidden="true" />
              {dict.upload.remove}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
