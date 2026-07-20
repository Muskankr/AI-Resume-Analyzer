import React, { useEffect, useState } from "react";
import "./UndoToast.css";

interface UndoToastProps {
  message?: string;
  durationSeconds?: number;
  onUndo: () => void;
  onClose: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  message = "Analysis reset.",
  durationSeconds = 5,
  onUndo,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="undo-toast-container" role="alert" aria-live="polite">
      <div className="undo-toast-content">
        <span className="undo-toast-message">🧹 {message}</span>
        <button type="button" className="undo-toast-btn" onClick={onUndo}>
          ↩️ Undo ({timeLeft}s)
        </button>
      </div>
      <div
        className="undo-toast-progress"
        style={{ animationDuration: `${durationSeconds}s` }}
      />
    </div>
  );
};
