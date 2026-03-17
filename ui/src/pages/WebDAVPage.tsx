import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import {
  fetchWebDAVRemotes,
  fetchWebDAVList,
  submitWebDAVDownload,
  uploadWebDAVFiles,
  createWebDAVDirectory,
  deleteWebDAVFiles,
  type WebDAVRemote,
  type WebDAVFile,
} from "../utils/apis";
import {
  FaFolder,
  FaFile,
  FaChevronRight,
  FaDownload,
  FaArrowUp,
  FaTrash,
  FaUpload,
  FaFolderPlus,
} from "react-icons/fa6";

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

export function WebDAVPage() {
  const { t, isConnected, refresh, showToast } = useApp();

  // State
  const [remotes, setRemotes] = useState<WebDAVRemote[]>([]);
  const [remotesLoaded, setRemotesLoaded] = useState(false);
  const [selectedRemote, setSelectedRemote] = useState<string>("");
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [files, setFiles] = useState<WebDAVFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load remotes on mount
  useEffect(() => {
    if (!isConnected) return;

    fetchWebDAVRemotes().then((res) => {
      if (res.code === 200 && res.data.remotes) {
        setRemotes(res.data.remotes);
        // Auto-select first remote if available
        if (res.data.remotes.length > 0) {
          setSelectedRemote(res.data.remotes[0].name);
        }
      }
      setRemotesLoaded(true);
    });
  }, [isConnected]);

  // Load directory contents when remote or path changes
  const loadDirectory = useCallback(async () => {
    if (!selectedRemote) return;

    setLoading(true);
    setError(null);
    setSelectedFiles(new Set());

    try {
      const res = await fetchWebDAVList(selectedRemote, currentPath);
      if (res.code === 200) {
        setFiles(res.data.files || []);
      } else {
        setError(res.message);
        setFiles([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load directory"
      );
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRemote, currentPath]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  // Navigate to a path
  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  // Navigate up one level
  const navigateUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

  // Toggle file selection
  const toggleSelect = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  // Select/deselect all files
  const toggleSelectAll = () => {
    const selectableFiles = files.filter((f) => !f.isDir);
    if (selectedFiles.size === selectableFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(selectableFiles.map((f) => f.path)));
    }
  };

  // Download selected files
  const handleDownload = async () => {
    if (selectedFiles.size === 0) return;

    setSubmitting(true);
    try {
      const res = await submitWebDAVDownload(
        selectedRemote,
        Array.from(selectedFiles)
      );
      if (res.code === 200) {
        const count = selectedFiles.size;
        setSelectedFiles(new Set());
        refresh(); // Refresh jobs list
        showToast(
          "success",
          count === 1
            ? t.download_queued ||
                "Download started. Check progress on Download page."
            : `${count} ${t.downloads_queued || "downloads started. Check progress on Download page."}`
        );
      } else {
        setError(res.message);
        showToast("error", res.message);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start download";
      setError(msg);
      showToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (list: FileList | null) => {
    const filesToUpload = Array.from(list || []);
    if (!selectedRemote || filesToUpload.length === 0 || uploading) return;

    setUploading(true);
    try {
      const res = await uploadWebDAVFiles(
        selectedRemote,
        currentPath,
        filesToUpload
      );
      if (res.code === 200) {
        await loadDirectory();
        showToast(
          "success",
          `${res.data.count} file${res.data.count > 1 ? "s" : ""} uploaded`
        );
      } else {
        setError(res.message);
        showToast("error", res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload files";
      setError(msg);
      showToast("error", msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!selectedRemote || creatingFolder) return;

    const name = window.prompt("Folder name");
    if (!name || !name.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await createWebDAVDirectory(
        selectedRemote,
        currentPath,
        name.trim()
      );
      if (res.code === 200) {
        await loadDirectory();
        showToast("success", `Folder created: ${res.data.name}`);
      } else {
        setError(res.message);
        showToast("error", res.message);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create directory";
      setError(msg);
      showToast("error", msg);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDelete = async (file: WebDAVFile) => {
    if (!selectedRemote || deletingPath) return;
    const confirmed = window.confirm(
      `Delete ${file.isDir ? "folder" : "file"} "${file.name}"?`
    );
    if (!confirmed) return;

    setDeletingPath(file.path);
    try {
      const res = await deleteWebDAVFiles(selectedRemote, [file.path]);
      if (res.code === 200) {
        await loadDirectory();
        showToast("success", `${file.name} deleted`);
      } else {
        setError(res.message);
        showToast("error", res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete item";
      setError(msg);
      showToast("error", msg);
    } finally {
      setDeletingPath(null);
    }
  };

  // Build breadcrumb parts
  const pathParts = currentPath.split("/").filter(Boolean);

  // Calculate selected size
  const selectedSize = files
    .filter((f) => selectedFiles.has(f.path))
    .reduce((sum, f) => sum + f.size, 0);

  const selectableFiles = files.filter((f) => !f.isDir);
  const allSelected =
    selectableFiles.length > 0 && selectedFiles.size === selectableFiles.length;

  // Show loading while fetching remotes
  if (!remotesLoaded) {
    return (
      <div className="p-0">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t.webdav_browser}</h1>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-6 sm:p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  // No remotes configured
  if (remotes.length === 0) {
    return (
      <div className="p-0">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t.webdav_browser}</h1>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-6 sm:p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            {t.no_webdav_servers}
          </p>
          <Link
            to="/config"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t.go_to_settings}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t.webdav_browser}</h1>

      {/* Remote Selector */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {t.select_remote}
          </label>
          <select
            value={selectedRemote}
            onChange={(e) => {
              setSelectedRemote(e.target.value);
              setCurrentPath("/");
            }}
            className="w-full sm:max-w-xs px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
          >
            {remotes.map((remote) => (
              <option key={remote.name} value={remote.name}>
                {remote.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedRemote || uploading || creatingFolder || !!deletingPath}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaUpload />
            {uploading ? t.loading : (t.upload_files || "Upload Files")}
          </button>
          <button
            type="button"
            onClick={handleCreateFolder}
            disabled={!selectedRemote || creatingFolder || uploading || !!deletingPath}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaFolderPlus />
            {creatingFolder ? t.loading : (t.new_folder || "New Folder")}
          </button>
        </div>
      </div>

      {/* File Browser */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        {/* Breadcrumb */}
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-1 text-sm overflow-x-auto">
          <button
            onClick={() => navigateTo("/")}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {selectedRemote}:
          </button>
          <FaChevronRight className="text-zinc-400 text-xs shrink-0" />
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              <button
                onClick={() =>
                  navigateTo("/" + pathParts.slice(0, i + 1).join("/"))
                }
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {part}
              </button>
              {i < pathParts.length - 1 && (
                <FaChevronRight className="text-zinc-400 text-xs shrink-0" />
              )}
            </span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-b border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* File List */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {loading ? (
            <div className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
              {t.loading}
            </div>
          ) : files.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
              {t.empty_directory}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-3 sm:px-4 py-2 bg-zinc-50 dark:bg-zinc-900 flex items-center gap-2 sm:gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                <div className="w-5 sm:w-6 shrink-0">
                  {selectableFiles.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">{t.name}</div>
                <div className="w-16 sm:w-24 text-right shrink-0">Size</div>
                <div className="w-10 shrink-0"></div>
              </div>

              {/* Parent directory */}
              {currentPath !== "/" && (
                <button
                  onClick={navigateUp}
                  className="w-full px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-left"
                >
                  <div className="w-5 sm:w-6 shrink-0"></div>
                  <div className="flex items-center gap-2 flex-1 text-zinc-600 dark:text-zinc-400 min-w-0">
                    <FaArrowUp className="text-zinc-400 shrink-0" />
                    <span>..</span>
                  </div>
                  <div className="w-16 sm:w-24 text-right text-zinc-400 shrink-0">-</div>
                  <div className="w-10 shrink-0"></div>
                </button>
              )}

              {/* Files */}
              {files.map((file) => (
                <div
                  key={file.path}
                  className={clsx(
                    "px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-4",
                    file.isDir
                      ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                      : selectedFiles.has(file.path)
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  )}
                  onClick={() => file.isDir && navigateTo(file.path)}
                >
                  <div className="w-5 sm:w-6 shrink-0">
                    {!file.isDir && (
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(file.path);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {file.isDir ? (
                      <FaFolder className="text-amber-500 shrink-0" />
                    ) : (
                      <FaFile className="text-zinc-400 shrink-0" />
                    )}
                    <span className="truncate text-sm sm:text-base">{file.name}</span>
                  </div>
                  <div className="w-16 sm:w-24 text-right text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm shrink-0">
                    {formatSize(file.size)}
                  </div>
                  <div className="w-10 shrink-0 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file);
                      }}
                      disabled={uploading || creatingFolder || deletingPath === file.path}
                      className="p-2 rounded text-zinc-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t.delete_remote || t.delete}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Actions */}
        {selectedFiles.size > 0 && (
          <div className="px-3 sm:px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              {selectedFiles.size} {t.selected_files} (
              {formatSize(selectedSize)})
            </span>
            <button
              onClick={handleDownload}
              disabled={submitting}
              className={clsx(
                "px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-white w-full sm:w-auto",
                submitting
                  ? "bg-zinc-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              <FaDownload />
              {submitting ? t.adding : t.download_selected}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
