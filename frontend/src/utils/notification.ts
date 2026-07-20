/**
 * Utility functions for Web Notifications API and Page Visibility API integration.
 */

/**
 * Requests notification permission if the browser supports notifications
 * and permission has not already been granted or denied.
 * Called on user action (e.g. clicking analyze/sample button) to ensure gesture context.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  return Notification.permission;
};

/**
 * Fires a native browser notification if the current tab is unfocused/hidden
 * and notification permission has been granted.
 */
export const sendAnalysisCompleteNotification = (fileName?: string): void => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted" && document.hidden) {
    const title = "Resume Analysis Complete 🚀";
    const displayName = fileName ? `"${fileName}"` : "Your resume";
    const body = `Analysis for ${displayName} is complete! Click to view your ATS score & recommendations.`;

    const notification = new Notification(title, {
      body,
      icon: "/vite.svg",
      tag: "resume-analysis-complete",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};
