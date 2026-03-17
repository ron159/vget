import { useState } from "react";
import logo from "../assets/logo.png";
import { useApp } from "../context/AppContext";

export function AuthScreen() {
  const { t, login } = useApp();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await login(password.trim());
      if (!result.ok) {
        setError(result.message || t.auth_login_failed);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-white flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg shadow-zinc-950/5 dark:shadow-black/20 p-6 flex flex-col gap-5"
      >
        <div className="flex items-center gap-3">
          <img src={logo} alt="vget" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-lg font-semibold">{t.auth_required_title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t.auth_required_desc}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="auth-password"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            {t.auth_password}
          </label>
          <input
            id="auth-password"
            type="password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t.auth_password_placeholder}
            className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!password.trim() || submitting}
          className="w-full px-4 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? t.auth_signing_in : t.auth_sign_in}
        </button>
      </form>
    </div>
  );
}
