import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  ToastContainer,
  type ToastData,
  type ToastType,
} from "../components/Toast";
import {
  type UITranslations,
  type ServerTranslations,
  defaultTranslations,
  defaultServerTranslations,
} from "../utils/translations";
import { normalizeLanguage } from "../utils/languages";
import {
  type Job,
  type HealthData,
  type WebDAVServer,
    fetchHealth,
    fetchJobs,
    fetchConfig,
    fetchI18n,
    fetchAuthStatus,
    createSession,
    updateConfig,
    setConfigValue,
    postDownload,
  addWebDAVServer,
  updateWebDAVServer,
  deleteWebDAVServer,
  deleteJob,
  clearHistory,
} from "../utils/apis";
import { type ConfigValues } from "../components/ConfigEditor";

type ThemePreference = "system" | "dark" | "light";

interface AppContextType {
  // Connection state
  health: HealthData | null;
  isConnected: boolean;
  loading: boolean;
  authRequired: boolean;
  authenticated: boolean;
  authChecking: boolean;

  // Jobs
  jobs: Job[];

  // Config
  outputDir: string;
  configLang: string;
  configFormat: string;
  configQuality: string;
  serverPort: number;
  maxConcurrent: number;
  apiKey: string;
  webdavServers: Record<string, WebDAVServer>;
  kuaidi100Key: string;
  kuaidi100Customer: string;
  torrentEnabled: boolean;
  telegramTdataPath: string;
  transcribe: boolean;
  transcribeFormat: string;

  // Translations
  t: UITranslations;
  serverT: ServerTranslations;

  // Theme
  darkMode: boolean;
  themePreference: ThemePreference;
  cycleThemePreference: () => void;

  // Actions
  refresh: () => Promise<void>;
  login: (password: string) => Promise<{ ok: boolean; message?: string }>;
  submitDownload: (url: string, transcribe: boolean) => Promise<boolean>;
  cancelDownload: (id: string) => Promise<void>;
  removeJob: (id: string) => Promise<void>;
  removeAllJobs: () => Promise<void>;
  updateOutputDir: (dir: string) => Promise<boolean>;
  saveConfig: (values: ConfigValues) => Promise<void>;
  addWebDAV: (
    name: string,
    url: string,
    username: string,
    password: string
  ) => Promise<void>;
  updateWebDAV: (
    oldName: string,
    name: string,
    url: string,
    username: string,
    password: string
  ) => Promise<void>;
  deleteWebDAV: (name: string) => Promise<void>;
  showToast: (type: ToastType, message: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [outputDir, setOutputDir] = useState("");
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem("vget-theme");
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved;
    }
    return "system";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return true;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [t, setT] = useState<UITranslations>(defaultTranslations);
  const [serverT, setServerT] = useState<ServerTranslations>(
    defaultServerTranslations
  );
  const [configLang, setConfigLang] = useState("");
  const [configFormat, setConfigFormat] = useState("");
  const [configQuality, setConfigQuality] = useState("");
  const [serverPort, setServerPort] = useState(8080);
  const [maxConcurrent, setMaxConcurrent] = useState(10);
  const [apiKey, setApiKey] = useState("");
  const [webdavServers, setWebdavServers] = useState<
    Record<string, WebDAVServer>
  >({});
  const [kuaidi100Key, setKuaidi100Key] = useState("");
  const [kuaidi100Customer, setKuaidi100Customer] = useState("");
  const [torrentEnabled, setTorrentEnabled] = useState(false);
  const [telegramTdataPath, setTelegramTdataPath] = useState("");
  const [transcribe, setTranscribe] = useState(false);
  const [transcribeFormat, setTranscribeFormat] = useState("txt");
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const cycleThemePreference = useCallback(() => {
    setThemePreference((current) => {
      if (current === "system") return "dark";
      if (current === "dark") return "light";
      return "system";
    });
  }, []);

  const darkMode =
    themePreference === "system" ? systemPrefersDark : themePreference === "dark";

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("vget-theme", themePreference);
  }, [themePreference]);

  const refresh = useCallback(async () => {
    try {
      const [authRes, i18nRes] = await Promise.all([
        fetchAuthStatus(),
        fetchI18n(),
      ]);
      if (authRes.code === 200) {
        setAuthRequired(authRes.data.api_key_configured);
        setAuthenticated(authRes.data.authenticated);
      }

      if (i18nRes.code === 200) {
        // Merge with defaults to ensure new keys are available
        setT({ ...defaultTranslations, ...i18nRes.data.ui });
        setServerT({ ...defaultServerTranslations, ...i18nRes.data.server });
      }

      if (authRes.code === 200 && authRes.data.api_key_configured && !authRes.data.authenticated) {
        setHealth(null);
        setJobs([]);
        return;
      }

      const [healthRes, jobsRes, configRes] = await Promise.all([
        fetchHealth(),
        fetchJobs(),
        fetchConfig(),
      ]);
      if (healthRes.code === 200) setHealth(healthRes.data);
      if (jobsRes.code === 200) setJobs(jobsRes.data.jobs || []);
      if (configRes.code === 200) {
        setOutputDir(configRes.data.output_dir);
        setConfigLang(normalizeLanguage(configRes.data.language));
        setConfigFormat(configRes.data.format || "");
        setConfigQuality(configRes.data.quality || "");
        setServerPort(configRes.data.server_port || 8080);
        setMaxConcurrent(configRes.data.server_max_concurrent || 10);
        setApiKey(configRes.data.server_api_key || "");
        setWebdavServers(configRes.data.webdav_servers || {});
        const kuaidi100Cfg = configRes.data.express?.kuaidi100;
        setKuaidi100Key(kuaidi100Cfg?.key || "");
        setKuaidi100Customer(kuaidi100Cfg?.customer || "");
        setTorrentEnabled(configRes.data.torrent_enabled || false);
        setTelegramTdataPath(configRes.data.telegram_tdata_path || "");
        setTranscribe(configRes.data.transcribe === true);
        setTranscribeFormat(configRes.data.transcribe_format || "txt");
      }
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  const submitDownload = useCallback(
    async (url: string, transcribe: boolean) => {
      const res = await postDownload(url.trim(), undefined, transcribe);
      if (res.code === 200) {
        refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  const login = useCallback(
    async (password: string) => {
      try {
        const res = await createSession(password);
        if (res.code === 200) {
          setAuthenticated(true);
          await refresh();
          return { ok: true };
        }
        return { ok: false, message: res.message };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : undefined,
        };
      }
    },
    [refresh]
  );

  // Cancel an active (queued/downloading) download
  const cancelDownload = useCallback(
    async (id: string) => {
      await deleteJob(id);
      refresh();
    },
    [refresh]
  );

  // Remove a finished (completed/failed/cancelled) job from the queue
  const removeJob = useCallback(
    async (id: string) => {
      await deleteJob(id);
      refresh();
    },
    [refresh]
  );

  // Remove all finished jobs from the queue
  const removeAllJobs = useCallback(async () => {
    await clearHistory();
    refresh();
  }, [refresh]);

  const updateOutputDir = useCallback(async (dir: string) => {
    const res = await updateConfig(dir.trim());
    if (res.code === 200) {
      setOutputDir(res.data.output_dir);
      return true;
    }
    return false;
  }, []);

  const saveConfig = useCallback(
    async (values: ConfigValues) => {
      await setConfigValue("language", normalizeLanguage(values.language));
      await setConfigValue("format", values.format || "mp4");
      await setConfigValue("quality", values.quality || "best");
      await setConfigValue(
        "server_max_concurrent",
        values.maxConcurrent || "10"
      );
      await setConfigValue("server_api_key", values.apiKey);
      if (values.twitterAuth) {
        await setConfigValue("twitter.auth_token", values.twitterAuth);
      }
      if (values.kuaidi100Key) {
        await setConfigValue("express.kuaidi100.key", values.kuaidi100Key);
      }
      if (values.kuaidi100Customer) {
        await setConfigValue(
          "express.kuaidi100.customer",
          values.kuaidi100Customer
        );
      }
      if (values.telegramTdataPath) {
        await setConfigValue("telegram.tdata_path", values.telegramTdataPath);
      }
      await setConfigValue("transcribe_format", values.transcribeFormat || "txt");
      refresh();
    },
    [refresh]
  );

  const addWebDAV = useCallback(
    async (name: string, url: string, username: string, password: string) => {
      const res = await addWebDAVServer(name, url, username, password);
      if (res.code === 200) {
        refresh();
      }
    },
    [refresh]
  );

  const deleteWebDAV = useCallback(
    async (name: string) => {
      const res = await deleteWebDAVServer(name);
      if (res.code === 200) {
        refresh();
      }
    },
    [refresh]
  );

  const updateWebDAV = useCallback(
    async (
      oldName: string,
      name: string,
      url: string,
      username: string,
      password: string
    ) => {
      const res = await updateWebDAVServer(oldName, name, url, username, password);
      if (res.code === 200) {
        refresh();
      }
    },
    [refresh]
  );

  const isConnected = health?.status === "ok";

  return (
    <AppContext.Provider
      value={{
        health,
        isConnected,
        loading,
        authRequired,
        authenticated,
        authChecking,
        jobs,
        outputDir,
        configLang,
        configFormat,
        configQuality,
        serverPort,
        maxConcurrent,
        apiKey,
        webdavServers,
        kuaidi100Key,
        kuaidi100Customer,
        torrentEnabled,
        telegramTdataPath,
        transcribe,
        transcribeFormat,
        t,
        serverT,
        darkMode,
        themePreference,
        cycleThemePreference,
        refresh,
        login,
        submitDownload,
        cancelDownload,
        removeJob,
        removeAllJobs,
        updateOutputDir,
        saveConfig,
        addWebDAV,
        updateWebDAV,
        deleteWebDAV,
        showToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
