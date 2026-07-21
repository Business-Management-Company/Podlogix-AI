import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface UploadParameters {
  method: "PUT";
  url: string;
  headers?: Record<string, string>;
}

interface UploadedFileResult {
  name: string;
  size: number;
  type: string;
  /** Public URL of the uploaded object (signed-URL upload path converted to its public form). */
  uploadURL: string;
  response: { uploadURL: string };
}

interface UploadResultLike {
  successful: UploadedFileResult[];
  failed: { name: string; error: string }[];
}

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  /**
   * Called per file to obtain a presigned upload URL.
   * Receives the browser File (has .name, .size, .type).
   */
  onGetUploadParameters: (file: File) => Promise<UploadParameters>;
  onComplete?: (result: UploadResultLike) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/** Convert a Supabase signed-upload URL into the object's public URL. */
function toPublicUrl(signedUrl: string): string {
  return signedUrl.split("?")[0].replace("/object/upload/sign/", "/object/public/");
}

function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string> | undefined,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    for (const [k, v] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 200)}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

/**
 * File upload button with inline progress. Requests a presigned URL per file
 * via onGetUploadParameters, PUTs the file directly to storage, and reports
 * completed uploads through onComplete.
 *
 * (Replaces the previous Uppy/AwsS3 implementation, which required an ETag
 * response header that Supabase Storage does not expose.)
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, maxNumberOfFiles);

    const oversize = files.find((f) => f.size > maxFileSize);
    if (oversize) {
      setStatus("error");
      setErrorMessage(
        `${oversize.name} is too large (max ${(maxFileSize / (1024 * 1024)).toFixed(0)} MB)`,
      );
      return;
    }

    setStatus("uploading");
    setErrorMessage("");
    const successful: UploadedFileResult[] = [];
    const failed: { name: string; error: string }[] = [];

    for (const file of files) {
      setCurrentFile(file.name);
      setProgress(0);
      try {
        const params = await onGetUploadParameters(file);
        await putWithProgress(params.url, file, params.headers, setProgress);
        const publicUrl = toPublicUrl(params.url);
        successful.push({
          name: file.name,
          size: file.size,
          type: file.type,
          uploadURL: publicUrl,
          response: { uploadURL: publicUrl },
        });
      } catch (err) {
        failed.push({ name: file.name, error: err instanceof Error ? err.message : "Upload failed" });
      }
    }

    if (failed.length > 0 && successful.length === 0) {
      setStatus("error");
      setErrorMessage(failed[0].error);
    } else {
      setStatus("done");
    }

    if (successful.length > 0) {
      onComplete?.({ successful, failed });
    }

    // allow re-selecting the same file
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="*/*"
        multiple={maxNumberOfFiles > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        data-testid="input-file-upload"
      />
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className={buttonClassName}
      >
        {status === "uploading" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        {children}
      </Button>

      {status === "uploading" && (
        <div className="space-y-1">
          <div className="h-2 w-full max-w-xs rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Uploading {currentFile}… {progress}%
          </p>
        </div>
      )}
      {status === "done" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-upload-done">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Upload complete
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-destructive flex items-center gap-1" data-testid="text-upload-error">
          <AlertCircle className="h-3.5 w-3.5" /> {errorMessage}
        </p>
      )}
    </div>
  );
}
