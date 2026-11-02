import { PiArrowLeftBold } from "react-icons/pi";
import { useGoBack } from "../../hooks/useGoBack";

interface BackButtonProps {
  /** Route used when there is no in-app page to go back to; null hides the button then. */
  fallback: string | null;
  /** "dark" for use on the dark passport header. */
  tone?: "light" | "dark";
  label?: string;
  className?: string;
}

const toneClasses = {
  light:
    "text-primary-500 hover:text-primary-900 bg-primary-100 hover:bg-primary-200 focus-visible:ring-accent-500",
  dark: "text-white bg-primary-800 hover:bg-primary-700 focus-visible:ring-accent-400 focus-visible:ring-offset-primary-900",
};

export function BackButton({
  fallback,
  tone = "light",
  label = "Go back",
  className = "",
}: BackButtonProps) {
  const { canGoBack, goBack } = useGoBack(fallback);

  if (!canGoBack) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`shrink-0 inline-flex items-center justify-center h-11 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${toneClasses[tone]} ${className}`}
      aria-label={label}
    >
      <PiArrowLeftBold className="w-5 h-5" />
    </button>
  );
}
