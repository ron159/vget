import clsx from "clsx";
import { useRef, useEffect, useState } from "react";
import prettyBytes from "pretty-bytes";
import type { Job, JobStatus } from "../utils/apis";
import type { UITranslations } from "../utils/translations";

interface DownloadJobCardProps {
  job: Job;
  onCancel: () => void;
  onClear: () => void;
  t: UITranslations;
}

export function DownloadJobCard({
  job,
  onCancel,
  onClear,
  t,
}: DownloadJobCardProps) {
  const canCancel = job.status === "queued" || job.status === "downloading" || job.status === "transcribing";
  const canClear =
    job.status === "completed" ||
    job.status === "failed" ||
    job.status === "cancelled";

  // Track download speed with exponential moving average for smoothing
  const prevDownloaded = useRef<number>(0);
  const prevTime = useRef<number>(0);
  const smoothedSpeed = useRef<number>(0);
  const [speed, setSpeed] = useState<number>(0);

  useEffect(() => {
    if (job.status === "downloading") {
      const now = Date.now();
      // Initialize on first update
      if (prevTime.current === 0) {
        prevTime.current = now;
        prevDownloaded.current = job.downloaded;
        return;
      }

      const timeDelta = (now - prevTime.current) / 1000; // seconds
      const bytesDelta = job.downloaded - prevDownloaded.current;

      if (timeDelta > 0 && bytesDelta >= 0) {
        const instantSpeed = bytesDelta / timeDelta;
        // Exponential moving average: higher alpha = more weight on recent data
        const alpha = 0.7;
        smoothedSpeed.current =
          alpha * instantSpeed + (1 - alpha) * smoothedSpeed.current;
        setSpeed(smoothedSpeed.current);
      }

      prevDownloaded.current = job.downloaded;
      prevTime.current = now;
    } else {
      // Reset when not downloading
      prevDownloaded.current = 0;
      prevTime.current = 0;
      smoothedSpeed.current = 0;
      setSpeed(0);
    }
  }, [job.downloaded, job.status]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!job.transcription_started_at || job.status !== "transcribing") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [job.transcription_started_at, job.status]);
  const startedAt = Date.parse(job.transcription_started_at || "");
  const endedAt = job.status === "transcribing" ? now : Date.parse(job.updated_at || "");
  const elapsed = Number.isFinite(startedAt) && Number.isFinite(endedAt)
    ? Math.max(0, Math.floor((endedAt - startedAt) / 1000)) : null;
  const stages = [t.transcribe_loading_model, t.transcribe_recognizing, t.transcribe_writing];
  const stageIndex = Math.max(0, ["loading_model", "transcribing", "writing"].indexOf(job.transcription_stage || ""));

  const statusText: Record<JobStatus, string> = {
    queued: t.queued,
    downloading: t.downloading,
    transcribing: t.transcribing || "transcribing...",
    completed: t.completed,
    failed: t.failed,
    cancelled: t.cancelled,
  };

  const statusStyles: Record<JobStatus, string> = {
    queued: "bg-zinc-300 dark:bg-zinc-700 text-zinc-500",
    downloading:
      "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    transcribing:
      "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    completed:
      "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500",
    failed: "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-500",
    cancelled: "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-600",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
        <code className="text-xs text-zinc-400 dark:text-zinc-600 truncate">
          {job.id}
        </code>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={clsx(
              "inline-block px-2 py-1 rounded text-[0.65rem] sm:text-[0.7rem] font-medium uppercase",
              statusStyles[job.status]
            )}
          >
            {statusText[job.status]}
          </span>
          {canCancel && (
            <button
              className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-zinc-500 dark:text-zinc-600 text-[0.65rem] sm:text-[0.7rem] cursor-pointer hover:border-red-500 hover:text-red-500 transition-colors"
              onClick={onCancel}
            >
              {t.cancel}
            </button>
          )}
          {canClear && (
            <button
              className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-zinc-500 text-[0.65rem] sm:text-[0.7rem] cursor-pointer hover:border-red-500 hover:text-red-500 transition-colors"
              onClick={onClear}
            >
              {t.clear_history}
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-200 break-all mb-2">
        {job.url}
      </p>
      {job.filename && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
          {job.filename}
        </p>
      )}
      {job.status === "downloading" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-3">
          <div className="flex-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded overflow-hidden">
            <div
              className={clsx(
                "h-full bg-blue-500 transition-all duration-300",
                job.total <= 0 && "animate-indeterminate"
              )}
              style={{ width: job.total > 0 ? `${job.progress}%` : "100%" }}
            />
          </div>
          <div className="flex justify-between sm:justify-end gap-3">
            <span className="text-xs text-zinc-400 dark:text-zinc-600 sm:min-w-18 text-left sm:text-right">
              {job.total > 0
                ? `${job.progress.toFixed(1)}%`
                : prettyBytes(job.downloaded)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 sm:min-w-20 text-right">
              {prettyBytes(speed, { bits: false }) + "/s"}
            </span>
          </div>
        </div>
      )}
      {job.status === "transcribing" && (
        <div className="flex flex-col gap-3 mt-3" role="status" aria-live="polite">
          <ol className="grid grid-cols-3 gap-2 text-xs">
            {stages.map((stage, index) => (
              <li key={stage} aria-current={index === stageIndex ? "step" : undefined}
                className={clsx("border-t-2 pt-2", index <= stageIndex
                  ? "border-purple-500 text-purple-700 dark:text-purple-300"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400")}>
                {index + 1}. {stage}
              </li>
            ))}
          </ol>
          <div role="progressbar" aria-label={stages[stageIndex]} aria-valuetext={stages[stageIndex]}
            className="h-1.5 overflow-hidden rounded bg-purple-100 dark:bg-purple-950">
            <div className="h-full w-full animate-indeterminate bg-purple-500" />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.transcribe_time_unknown}</p>
        </div>
      )}
      {elapsed !== null && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400" aria-live="off">
          {t.transcribe_elapsed}: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </p>
      )}
      {job.status === "failed" && job.error && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
          {job.error}
        </div>
      )}
    </div>
  );
}
