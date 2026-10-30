export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "success"
  | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const secondaryClasses =
  "bg-white text-primary-700 border border-primary-300 hover:bg-primary-50 focus-visible:ring-accent-500";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-white hover:bg-accent-700 focus-visible:ring-accent-500",
  secondary: secondaryClasses,
  // Alias of secondary, kept so existing call sites keep working.
  outline: secondaryClasses,
  danger:
    "bg-error-600 text-white hover:bg-error-700 focus-visible:ring-error-500",
  success:
    "bg-success-600 text-white hover:bg-success-700 focus-visible:ring-success-500",
  ghost: "text-primary-600 hover:bg-primary-100 focus-visible:ring-accent-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

/** Button styling, also for elements that aren't a <button>, such as a router Link. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  return `inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
}
