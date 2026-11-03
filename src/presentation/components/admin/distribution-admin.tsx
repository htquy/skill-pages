"use client";
import { useEffect, useState } from "react";
import { parseGitHubReleaseUrl, type AppSourceRecord, type AppReleaseRecord, type SourceInput } from "@/src/domain/apps/distribution";
import { useR2Upload } from "@/src/presentation/components/upload/use-r2-upload";

const initial: SourceInput = { key: "app", name: "VideoTool", version: "1.0.1", kind: "APPLICATION", format: "ZIP",
  platform: "win-x64", url: "", sha256: "", size: 0, fileName: "VideoTool-win-x64.zip", installDirectory: "",
  entryPoint: "DirectorCraftStudio.exe", requiredFiles: ["VideoTool.Updater.exe", "libSkiaSharp.dll", "libHarfBuzzSharp.dll", "av_libglesv2.dll"], description: "", metadata: {} };
const fieldClass = "mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm";
const buttonClass = "rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-40";
type Config = { sources: AppSourceRecord[]; releases: AppReleaseRecord[] };
async function api(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data.data;
}
export function DistributionAdmin({ apps }: { apps: { slug: string; name: string }[] }) {
  const [slug, setSlug] = useState(apps.find(a => a.slug === "video-tool")?.slug ?? apps[0]?.slug ?? "");
  const [config, setConfig] = useState<Config>({ sources: [], releases: [] });
  const [source, setSource] = useState<SourceInput>(initial), [editId, setEditId] = useState<string>();
  const [requiredFiles, setRequiredFiles] = useState(initial.requiredFiles.join("\n"));
  const [metadata, setMetadata] = useState("{}"), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), [selected, setSelected] = useState<string[]>([]);
  const [version, setVersion] = useState("1.0.1"), [channel, setChannel] = useState("stable"), [notes, setNotes] = useState("");
  const { state, upload, cancel } = useR2Upload("app-source");
  const uploading = ["preparing", "uploading", "completing"].includes(state.status);
  const base = `/api/admin/apps/${encodeURIComponent(slug)}/distribution`;
  useEffect(() => {
    if (!slug) return;
    let active = true;
    api(`/api/admin/apps/${encodeURIComponent(slug)}/distribution`).then(data => {
      if (active) { setConfig(data); setSelected([]); setEditId(undefined); setSource(initial); setRequiredFiles(initial.requiredFiles.join("\n")); setMetadata("{}"); }
    }).catch(e => { if (active) setMessage(String(e)); });
    return () => { active = false; };
  }, [slug]);
  async function action(work: () => Promise<unknown>) {
    setBusy(true); setMessage("");
    try { await work(); setConfig(await api(base)); setMessage("Đã lưu."); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  function edit(row: AppSourceRecord) {
    const pinned = config.releases.some(r => r.sources.some(s => s.id === row.id));
    setEditId(pinned ? undefined : row.id); setSource(row); setRequiredFiles(row.requiredFiles.join("\n")); setMetadata(JSON.stringify(row.metadata, null, 2));
    if (pinned) setMessage("File đã ghim được mở làm mẫu. Đổi version và upload file mới để tạo phiên bản mới.");
  }
  async function fillFromGitHub() {
    const release = parseGitHubReleaseUrl(source.url); if (!release) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(release.owner)}/${encodeURIComponent(release.repo)}/releases/tags/${encodeURIComponent(release.tag)}`,
        { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 404 ? "Không tìm thấy GitHub Release public cho tag này" : `GitHub API HTTP ${response.status}`);
      const data = await response.json() as { assets?: { name: string; size: number; digest?: string | null }[] };
      const asset = data.assets?.find(a => a.name === release.asset);
      if (!asset) throw new Error(`Release ${release.tag} không có file ${release.asset}`);
      const sha256 = asset.digest?.startsWith("sha256:") ? asset.digest.slice(7) : "";
      const tagVersion = /^v?(\d+\.\d+\.\d+)$/.exec(release.tag)?.[1];
      setSource(s => ({ ...s, fileName: asset.name, size: asset.size, sha256: sha256 || s.sha256, version: tagVersion ?? s.version }));
      setMessage(sha256 ? "Đã lấy thông tin từ GitHub." : "Đã lấy dung lượng; GitHub chưa có digest, hãy nạp file .sha256.");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  function input(name: keyof SourceInput, label: string, type = "text") {
    return <label className="text-sm">{label}<input className={fieldClass} type={type} required
      value={String(source[name])} onChange={e => setSource({ ...source, [name]: type === "number" ? Number(e.target.value) : e.target.value })} /></label>;
  }
  return <div className="space-y-6">
    <label className="block max-w-md text-sm">Ứng dụng<select disabled={busy || uploading} className={fieldClass} value={slug} onChange={e => setSlug(e.target.value)}>
      {apps.map(a => <option key={a.slug} value={a.slug}>{a.name} ({a.slug})</option>)}</select></label>
    <p role="status" aria-live="polite" className="text-sm text-brand-700">{message || state.error}</p>
    {!slug ? <p>Hãy tạo ứng dụng tại Quản lý apps trước.</p> : <>
    <form className="rounded-xl border border-zinc-200 bg-white p-5" onSubmit={e => { e.preventDefault(); void action(async () => {
      const extra: unknown = JSON.parse(metadata);
      if (!extra || Array.isArray(extra) || typeof extra !== "object") throw new Error("Metadata phải là JSON object");
      await api(base + "/sources" + (editId ? "/" + editId : ""), editId ? "PUT" : "POST", { ...source,
        requiredFiles: requiredFiles.split(/\r?\n/).map(s => s.trim()).filter(Boolean), metadata: extra });
      setEditId(undefined);
    }); }}>
      <h2 className="mb-4 text-lg font-semibold">1. {editId ? "Sửa file chưa ghim" : "Thêm phiên bản file"}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {input("key", "Mã thành phần (app, ffmpeg, opencode…)")}{input("name", "Tên hiển thị")}{input("version", "Phiên bản x.y.z")}
        <label className="text-sm">Loại<select className={fieldClass} value={source.kind} onChange={e => setSource({ ...source, kind: e.target.value as SourceInput["kind"] })}><option>APPLICATION</option><option>RESOURCE</option></select></label>
        <label className="text-sm">Định dạng<select className={fieldClass} value={source.format} onChange={e => setSource({ ...source, format: e.target.value as SourceInput["format"] })}><option>ZIP</option><option>FILE</option></select></label>
        <label className="text-sm">Platform<input className={fieldClass} value="win-x64" readOnly /></label>
        {input("fileName", "Tên file tải về")}{input("entryPoint", "File bắt buộc sau giải nén")}
        <label className="text-sm">Thư mục trong Binaries (ZIP tài nguyên)<input className={fieldClass} value={source.installDirectory} onChange={e => setSource({ ...source, installDirectory: e.target.value })} /></label>
        <label className="text-sm md:col-span-2">URL tải (Cloudflare R2 hoặc GitHub Release)<input className={fieldClass} type="url" required placeholder="https://github.com/owner/repo/releases/download/v1.0.0/App-1.0.0-win-x64.zip" value={source.url} onChange={e => setSource({ ...source, url: e.target.value.trim() })} />
          {parseGitHubReleaseUrl(source.url) && <button type="button" disabled={busy} className={buttonClass + " mt-2"} onClick={() => void fillFromGitHub()}>Lấy tên file, dung lượng, SHA-256 từ GitHub</button>}</label>
        {input("size", "Dung lượng byte", "number")}
        <label className="text-sm md:col-span-2">SHA-256<input required pattern="[a-fA-F0-9]{64}" className={fieldClass} value={source.sha256} onChange={e => setSource({ ...source, sha256: e.target.value.trim() })} /></label>
        <label className="text-sm">Nạp file .sha256<input className={fieldClass} type="file" accept=".sha256,.txt" onChange={async e => {
          const file = e.target.files?.[0]; if (file && file.size < 4096) { const hash = (await file.text()).trim().split(/\s+/)[0]; setSource(s => ({ ...s, sha256: hash })); }
        }} /></label>
        <label className="text-sm md:col-span-2">Hoặc upload gói/file lên R2 (tối đa 20 GiB)<input disabled={uploading || busy} className={fieldClass} type="file" accept=".zip,.exe,.onnx,.bin,.safetensors" onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          const url = await upload(file); if (url) setSource(s => ({ ...s, url, fileName: file.name, size: file.size, sha256: "" }));
        }} /></label>
        {uploading && <div role="status"><progress value={state.progress} max="100" className="w-full" /><p>{state.status} · {state.progress}%</p><button className={buttonClass} type="button" onClick={cancel}>Hủy upload</button></div>}
        <label className="text-sm">Nạp metadata .release.json<input className={fieldClass} type="file" accept=".json" onChange={async e => {
          const file = e.target.files?.[0]; if (!file || file.size > 65536) return;
          try { const data = JSON.parse(await file.text()) as SourceInput;
            setSource(s => ({ ...initial, ...data, url: data.url || s.url }));
            setRequiredFiles((data.requiredFiles ?? []).join("\n")); setMetadata(JSON.stringify(data.metadata ?? {}, null, 2)); setEditId(undefined);
          } catch { setMessage("Không đọc được metadata JSON"); }
        }} /></label>
        <label className="text-sm">File kiểm tra bổ sung (mỗi dòng một file)<textarea className={fieldClass} rows={3} value={requiredFiles} onChange={e => setRequiredFiles(e.target.value)} /></label>
        <label className="text-sm">Mô tả<textarea className={fieldClass} value={source.description} onChange={e => setSource({ ...source, description: e.target.value })} /></label>
        <label className="text-sm md:col-span-2">Metadata riêng của admin (JSON; có thể lưu publisherSourcePath, upstream, license)<textarea className={fieldClass} rows={3} value={metadata} onChange={e => setMetadata(e.target.value)} /></label>
      </div>
      <p className="my-3 text-xs text-zinc-500">Đường dẫn source trên máy publisher chỉ là metadata; server không đọc ổ E: của bạn. Upload tạo URL mới. SHA-256 lấy từ script đóng gói, không nạp model lớn vào bộ nhớ trình duyệt.</p>
      <div className="flex gap-3"><button disabled={busy || uploading} className={buttonClass}>Lưu phiên bản file</button><button type="button" className={buttonClass} onClick={() => { setEditId(undefined); setSource(initial); setRequiredFiles(initial.requiredFiles.join("\n")); setMetadata("{}"); }}>Tạo mới</button></div>
    </form>
    <section className="rounded-xl border border-zinc-200 bg-white p-5"><h2 className="text-lg font-semibold">2. Chọn file và tạo bản nháp</h2>
      <p className="my-2 text-xs text-zinc-500">Chọn một gói app và một phiên bản mỗi tài nguyên cần dùng. Tài nguyên tùy chọn chưa cài trên máy khách sẽ không bị tự tải. Xóa cấu hình chỉ áp dụng cho file chưa ghim; object R2 được giữ để tránh làm hỏng bản tải cũ.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Ghim</th><th>Thành phần</th><th>Phiên bản</th><th>Dung lượng</th><th>Thao tác</th></tr></thead><tbody>
        {config.sources.map(s => <tr className="border-t border-zinc-100" key={s.id}>
          <td><input aria-label={`Chọn ${s.key} ${s.version}`} type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(e.target.checked ? [...selected.filter(id => config.sources.find(row => row.id === id)?.key !== s.key), s.id] : selected.filter(id => id !== s.id))} /></td>
          <td className="py-3">{s.name}<div className="text-xs text-zinc-500">{s.key} · {s.format} · {s.platform}</div></td><td>{s.version}</td><td>{(s.size / 1024 ** 2).toFixed(1)} MiB</td>
          <td><button className={buttonClass} onClick={() => edit(s)}>Sửa</button> <button disabled={busy} className={buttonClass} onClick={() => { if (confirm(`Xóa cấu hình ${s.key} ${s.version}? Object trên R2 vẫn được giữ.`)) void action(() => api(base + "/sources/" + s.id, "DELETE")); }}>Xóa</button></td></tr>)}
      </tbody></table></div>
      <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); void action(async () => { await api(base + "/releases", "POST", { version, channel, platform: "win-x64", notes, sourceIds: selected }); setSelected([]); }); }}>
        <div className="flex flex-wrap gap-3"><label className="text-sm">Phiên bản bản phát hành<input className={fieldClass} required value={version} onChange={e => setVersion(e.target.value)} /></label><label className="text-sm">Kênh<select className={fieldClass} value={channel} onChange={e => setChannel(e.target.value)}><option>stable</option><option>beta</option></select></label></div>
        <p className="text-xs text-zinc-500">Có thể dùng lại gói app hiện tại trong bản phát hành mới để chỉ cập nhật tài nguyên.</p>
        <label className="block text-sm">Nội dung cập nhật<textarea className={fieldClass} rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></label><button disabled={busy || !selected.length} className={buttonClass}>Tạo bản nháp</button>
      </form>
    </section>
    <section className="rounded-xl border border-zinc-200 bg-white p-5"><h2 className="text-lg font-semibold">3. Phát hành</h2>
      <a className="my-2 block text-sm text-brand-600 underline" href={`/api/apps/${encodeURIComponent(slug)}/updates?channel=stable&platform=win-x64`} target="_blank" rel="noreferrer">Xem manifest stable</a>
      {config.releases.map(r => <div key={r.id} className="border-t py-4"><div className="flex flex-wrap items-center gap-3"><strong>{r.version}</strong><span className="text-sm">{r.channel} · {r.status}</span>
        {r.status === "DRAFT" && <><button disabled={busy} className={buttonClass} onClick={() => { if (confirm(`Phát hành ${r.version} tới người dùng?`)) void action(() => api(base + "/releases/" + r.id, "PATCH", { status: "PUBLISHED" })); }}>Phát hành</button><button disabled={busy} className={buttonClass} onClick={() => void action(() => api(base + "/releases/" + r.id, "DELETE"))}>Xóa nháp</button></>}
        {r.status === "PUBLISHED" && <button disabled={busy} className={buttonClass} onClick={() => { if (confirm("Thu hồi khỏi manifest? Máy đã cập nhật sẽ không bị hạ phiên bản.")) void action(() => api(base + "/releases/" + r.id, "PATCH", { status: "WITHDRAWN" })); }}>Thu hồi</button>}
      </div><p className="my-2 whitespace-pre-wrap text-sm">{r.notes}</p><p className="text-xs text-zinc-500">{r.sources.map(s => `${s.key}@${s.version}`).join(" · ")}</p></div>)}
    </section></>}
  </div>;
}
