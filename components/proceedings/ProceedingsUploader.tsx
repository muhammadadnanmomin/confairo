"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";

interface Props {
  conferenceId: string;
  /** Called after a successful upload */
  onUploaded?: () => void;
  /** Existing proceedings info (if replacing) */
  existingTitle?: string;
}

export default function ProceedingsUploader({
  conferenceId,
  onUploaded,
  existingTitle,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(existingTitle || "");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function handleFileChoice(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setErrorMsg("Only PDF files are allowed.");
      setStatus("error");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setErrorMsg("File must be under 50 MB.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFileChoice(f || null);
  }

  async function handleUpload() {
    if (!file || !title.trim()) return;
    setUploading(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("conferenceId", conferenceId);
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());

      const res = await fetch("/api/proceedings/upload", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error || "Upload failed");
        setStatus("error");
        return;
      }

      setStatus("success");
      onUploaded?.();
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Upload className="h-5 w-5 text-primary" />
        {existingTitle ? "Replace Proceedings" : "Upload Proceedings"}
      </h3>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/10"
            : file
              ? "border-success bg-success-surface"
              : "border-border hover:border-primary/40 hover:bg-accent"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFileChoice(e.target.files?.[0] || null)}
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-success" />
            <div className="text-left">
              <p className="font-medium text-foreground text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="ml-2 cursor-pointer p-1 rounded hover:bg-muted"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag & drop a PDF here, or <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, max 50 MB</p>
          </>
        )}
      </div>

      {/* Title */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-foreground mb-1">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. ICML 2026 Conference Proceedings"
          className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring outline-none"
        />
      </div>

      {/* Description */}
      <div className="mt-3">
        <label className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={2}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring outline-none resize-none"
        />
      </div>

      {/* Status */}
      {status === "error" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive-surface border border-destructive/30 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {status === "success" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-success-surface border border-success/30 px-3 py-2 text-sm text-success">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Proceedings uploaded and published successfully!
        </div>
      )}

      {/* Upload button */}
      <Button
        onClick={handleUpload}
        disabled={!file || !title.trim() || uploading}
        className="mt-4 w-full gap-2 bg-primary hover:bg-primary-hover text-primary-foreground"
      >
        {uploading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {existingTitle ? "Replace & Publish" : "Upload & Publish"}
          </>
        )}
      </Button>
    </Card>
  );
}
