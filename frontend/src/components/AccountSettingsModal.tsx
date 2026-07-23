import React, { useState } from "react";
import { X, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { BACKEND_URL } from "../config";
import type { AuthUser } from "../hooks/useAuth";
import axios from "axios";

interface AccountSettingsModalProps {
  user: AuthUser | null;
  onClose: () => void;
  onDeleteSuccess: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  user,
  onClose,
  onDeleteSuccess,
}) => {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteZone, setShowDeleteZone] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (confirmText !== "DELETE") {
      setError("Please type DELETE exactly to confirm.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await axios.delete(`${BACKEND_URL}/api/auth/delete-account/`, {
        headers: { Authorization: `Bearer ${user.token}` },
        data: { password, confirm_text: confirmText },
      });
      onDeleteSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to delete account";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal"
        style={{ maxWidth: "420px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            ⚙️ Account Settings
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>
            Logged in as: <strong>{user?.username}</strong>
          </p>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>
            Manage your account preferences and data deletion below.
          </p>
        </div>

        <hr
          style={{
            border: "0",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            marginBottom: "20px",
          }}
        />

        {!showDeleteZone ? (
          <div>
            <h4
              style={{
                color: "var(--color-danger)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "1rem",
                margin: "0 0 12px",
              }}
            >
              <Trash2 size={16} /> Danger Zone
            </h4>
            <p style={{ fontSize: "0.85rem", margin: "0 0 16px", opacity: 0.8 }}>
              Permanently delete your account and all associated data, including your
              resume upload history and ATS scores. This action is irreversible.
            </p>
            <button
              onClick={() => setShowDeleteZone(true)}
              className="app-btn"
              style={{
                width: "100%",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--color-danger)",
                color: "var(--color-danger)",
                padding: "10px 14px",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Delete Account & Data
            </button>
          </div>
        ) : (
          <form onSubmit={handleDelete}>
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "18px",
                display: "flex",
                gap: "10px",
              }}
            >
              <ShieldAlert
                size={20}
                style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <strong style={{ color: "var(--color-danger)", fontSize: "0.9rem" }}>
                  Confirm Irreversible Deletion
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", opacity: 0.9 }}>
                  All stored resume analyses and scores will be permanently deleted from the
                  database.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  marginBottom: "6px",
                }}
              >
                Type{" "}
                <code
                  style={{
                    color: "var(--color-danger)",
                    background: "rgba(0,0,0,0.1)",
                    padding: "2px 4px",
                    borderRadius: "4px",
                  }}
                >
                  DELETE
                </code>{" "}
                to confirm:
              </label>
              <input
                className="auth-input"
                type="text"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  marginBottom: "6px",
                }}
              >
                Confirm with your password:
              </label>
              <input
                className="auth-input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="auth-error" style={{ marginBottom: "14px" }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="app-btn app-btn--secondary"
                style={{ flex: 1, padding: "10px 14px", borderRadius: "8px" }}
                onClick={() => {
                  setShowDeleteZone(false);
                  setError("");
                  setPassword("");
                  setConfirmText("");
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="app-btn"
                style={{
                  flex: 1,
                  backgroundColor: "var(--color-danger)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="spin" /> : "Confirm Delete"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
