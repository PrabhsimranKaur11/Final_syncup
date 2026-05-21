import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      return setFeedback({ text: "Please complete both password fields.", type: "error" });
    }

    if (newPassword !== confirmPassword) {
      return setFeedback({ text: "Passwords do not match.", type: "error" });
    }

    if (!token && !code) {
      return setFeedback({ text: "Please enter the reset code from your email.", type: "error" });
    }

    setLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          code: token ? undefined : code,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return setFeedback({ text: result.message || "Unable to reset password.", type: "error" });
      }

      setFeedback({ text: result.message || "Password reset successful!", type: "success" });
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setFeedback({ text: "Server error. Please try again later.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSignIn = async () => {
    if (!code) return setFeedback({ text: "Please enter the reset code from your email.", type: "error" });
    setLoading(true);
    setFeedback({ text: "", type: "" });
    try {
      const res = await fetch("/api/auth/code-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) return setFeedback({ text: data.message || "Invalid code.", type: "error" });
      setFeedback({ text: "Signed in successfully.", type: "success" });
      setTimeout(() => navigate("/workspaces"), 700);
    } catch (err) {
      setFeedback({ text: "Server error. Please try again later.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#111827] flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full bg-white dark:bg-[#1f2937] border border-slate-200 dark:border-[#374151] rounded-3xl shadow-xl p-8">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white mb-4">Reset your password</h1>
        <p className="mb-6 text-slate-600 dark:text-slate-300">
          Enter the 6-digit code from your email and choose a new password. If you opened the email link, the token is already captured.
        </p>

        {feedback.text && (
          <div
            className={`mb-5 rounded-xl px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {!token && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Reset code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full rounded-2xl border border-slate-300 dark:border-[#4b5563] bg-slate-50 dark:bg-[#111827] px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full rounded-2xl border border-slate-300 dark:border-[#4b5563] bg-slate-50 dark:bg-[#111827] px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-2xl border border-slate-300 dark:border-[#4b5563] bg-slate-50 dark:bg-[#111827] px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-2xl bg-[#2563eb] text-white py-3 font-semibold transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <button
            onClick={handleCodeSignIn}
            disabled={loading}
            className="flex-1 rounded-2xl border border-slate-300 dark:border-[#4b5563] bg-white dark:bg-[#111827] text-slate-900 dark:text-white py-3 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Sign in with code"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
