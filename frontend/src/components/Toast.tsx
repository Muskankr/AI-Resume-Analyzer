import React from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  return (
    <div className={`toast toast--${type}`}>
      <span>{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        &times;
      </button>
    </div>
  );
};
