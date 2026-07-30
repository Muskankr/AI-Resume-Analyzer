import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  className = "",
  style,
  disabled,
  ...props
}) => {
  // Base structural styles shared across all buttons
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    opacity: disabled ? 0.6 : 1,
  };

  // Variant-specific styles mapping to our new scale and system tokens
const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      padding: "12px 36px",
      fontSize: "var(--font-size-base)",
      backgroundColor: "#6366f1",
      color: "#fff",
      borderRadius: "9999px", 
      boxShadow: "var(--shadow-card)",
      width: "100%",
      maxWidth: "280px"
    },
    secondary: {
      background: "transparent",
      color: "var(--btn-secondary-text)",
      fontSize: "var(--font-size-sm)",
      textDecoration: "underline",
      marginTop: "8px",
    },
    ghost: {
      padding: "8px 20px",
      fontSize: "var(--font-size-sm)",
      background: "rgba(255, 255, 255, 0.15)",
      color: "#ffffff",
      borderRadius: "9999px", /* Makes it a pill / capsule shape */
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
  };

  const combinedStyle = {
    ...baseStyle,
    ...variantStyles[variant],
    ...style,
  };

 return (
    <button
      className={`app-btn-custom app-btn-custom--${variant} ${className}`}
      style={combinedStyle}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};