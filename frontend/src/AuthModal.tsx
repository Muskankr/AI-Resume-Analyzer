import React, { useState } from "react";
import { useToast } from "./hooks/useToast";

interface AuthModalProps {
  onSignup: (username: string, password: string) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignup, onLogin, onClose }) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") await onSignup(username, password);
      else await onLogin(username, password);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
<div
  className="auth-overlay"
  onClick={onClose}
>      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button
  type="button"
  className="auth-close-btn"
  onClick={onClose}
  aria-label="Close"
>
  ✕
</button>
        <h3>{mode === "login" ? "🔐 Login" : "📝 Sign Up"}</h3>
        <form onSubmit={submit}>
          <input
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === "signup" && password && (() => {
            const hasMinLength = password.length >= 8;
            const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSymbol = /[^A-Za-z0-9]/.test(password);
            
            let score = 0;
            if (hasMinLength) score++;
            if (hasMixedCase) score++;
            if (hasNumber) score++;
            if (hasSymbol) score++;

            let strengthLabel = "Weak";
            let strengthLevel = "weak";
            let filledCount = 1;

            if (password.length >= 6) {
              if (score <= 1) {
                strengthLabel = "Weak";
                strengthLevel = "weak";
                filledCount = 1;
              } else if (score <= 3) {
                strengthLabel = "Medium";
                strengthLevel = "medium";
                filledCount = 2;
              } else {
                strengthLabel = "Strong";
                strengthLevel = "strong";
                filledCount = 3;
              }
            }

            return (
              <div className="password-strength-container">
                <div className="password-strength-label">
                  <span>Password Strength:</span>
                  <span className={`strength-val ${strengthLevel}`}>{strengthLabel}</span>
                </div>
                <div className="password-strength-bar-container">
                  <div className={`password-strength-segment ${filledCount >= 1 ? `${strengthLevel}-filled` : ""}`} />
                  <div className={`password-strength-segment ${filledCount >= 2 ? `${strengthLevel}-filled` : ""}`} />
                  <div className={`password-strength-segment ${filledCount >= 3 ? `${strengthLevel}-filled` : ""}`} />
                </div>
              </div>
            );
          })()}
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? "⏳ Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "No account? " : "Have an account? "}
          <button className="auth-switch-btn" onClick={() => { setMode(mode === "login" ? "signup" : "login"); }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
};
