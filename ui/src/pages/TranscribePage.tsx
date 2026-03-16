import { useState } from "react";
import clsx from "clsx";
import { useApp } from "../context/AppContext";
import { FaMicrophone, FaFileAudio } from "react-icons/fa6";
import { postTranscribe } from "../utils/apis";

export function TranscribePage() {
  const { isConnected, showToast, t } = useApp();
  const [filePath, setFilePath] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await postTranscribe(filePath.trim());
      if (res.code === 200) {
        showToast("success", t.transcribe_task_started || "Transcription task started processing.");
        setFilePath("");
      } else {
        showToast("error", res.message || t.transcribe_task_failed || "Failed to start transcription.");
      }
    } catch {
      showToast("error", t.transcribe_network_err || "Network error or server unavailable.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <FaMicrophone className="text-xl" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {useApp().t.voice_transcription || "Voice Transcription"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.transcribe_desc || "Convert existing downloaded audio/video files to text using AI."}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <FaFileAudio className="text-zinc-400" />
              {t.transcribe_file_path || "File Path"}
            </label>
            <input
              type="text"
              className={clsx(
                "w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg",
                "bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-sm",
                "focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors",
                "placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                "disabled:opacity-50"
              )}
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="/home/vget/downloads/my_podcast.mp3"
              disabled={!isConnected || submitting}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {t.transcribe_file_path_hint || "Provide the absolute path to the local media file within the vget output directory. Supported formats: .mp3, .m4a, .wav, .mp4, .mkv, .webm, .ts"}
            </p>
          </div>

          <button
            type="submit"
            className={clsx(
              "mt-2 px-6 py-3 border-none rounded-lg font-medium text-sm transition-colors self-start lg:self-auto",
              isConnected && filePath.trim() && !submitting
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
            )}
            disabled={!isConnected || !filePath.trim() || submitting}
          >
            {submitting ? (t.transcribe_starting || "Starting Task...") : (t.transcribe_start || "Start Transcription")}
          </button>
        </form>
      </div>
      
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700/50">
        <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">{t.transcribe_how_it_works || "How it works"}</h3>
        <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-disc pl-4">
          <li>{t.transcribe_how_1 || "The transcription uses the configured Alibaba FunASR model (default: SenseVoiceSmall)."}</li>
          <li>{t.transcribe_how_2 || "It runs locally on CPU and does not send your data to external APIs."}</li>
          <li>{t.transcribe_how_3 || "Once started, a background job will be created that you can track in the Downloads/Jobs view."}</li>
          <li>{t.transcribe_how_4 || "The output transcript will be saved as an `.srt` payload next to the original file."}</li>
          <li>{t.transcribe_how_5 || "Expect longer processing times for large files or when running on lower-end hardware."}</li>
        </ul>
      </div>
    </div>
  );
}
