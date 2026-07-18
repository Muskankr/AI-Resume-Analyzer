import React, { useState } from "react";
import { Button } from "./components/Button";

interface AuthModalProps {
  onSignup: (username: string, password: string) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignup, onLogin, onClose }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please complete all fields.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await onSignup(username, password);
      } else {
        await onLogin(username, password);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div 
        className="auth-modal-content" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true"
      >
        {/* Absolute Positioning Top Close Icon */}
        <button 
          onClick={onClose} 
          style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#64748b", fontSize: "18px", cursor: "pointer" }}
          aria-label="Close Modal"
          disabled={loading}
        >
          ✕
        </button>

        <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "700", textAlign: "center" }}>
          {mode === "login" ? "🔐 Welcome Back" : "✨ Create Account"}
        </h3>
        <p style={{ margin: "0 0 24px 0", fontSize: "var(--font-size-sm)", color: "#94a3b8", textAlign: "center" }}>
          {mode === "login" ? "Log in to resume your progress workspace" : "Sign up to start analyzing profile matrices"}
        </p>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171", padding: "10px", borderRadius: "var(--radius-sm)", fontSize: "12px", marginBottom: "16px", textAlign: "left" }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={submit}>
          {/* Username Input Field */}
          <div className="auth-input-wrapper">
            <input
              className="auth-input-field"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Password Input Field with Visibility Toggle */}
          <div className="auth-input-wrapper">
            <input
              className="auth-input-field"
              type={showPassword ? "text" : "password"}
              placeholder={mode === "login" ? "Password" : "Password (min 6 chars)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle-trigger"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showPassword ? "👁️" : "🙈"}
            </button>
          </div>

          {/* System Custom Reusable Button Component */}
          <Button 
            className="auth-submit-btn" 
            type="submit" 
            variant="primary"
            disabled={loading}
            style={{ width: "100%", maxWidth: "100%", marginTop: "8px" }}
          >

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
          </Button>
        </form>

        {/* View Toggle Link Switcher */}
        <p style={{ margin: "20px 0 0 0", fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
          {mode === "login" ? "No account? " : "Have an account? "}
          <button 
            className="auth-switch-btn" 
            style={{ background: "none", border: "none", color: "#6366f1", fontWeight: "600", cursor: "pointer", textDecoration: "underline", padding: 0 }}
            onClick={() => { 
              setMode(mode === "login" ? "signup" : "login"); 
              setError(""); 
            }}
            disabled={loading}
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
};
