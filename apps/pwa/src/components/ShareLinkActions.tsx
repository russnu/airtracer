import { useEffect, useId, useRef, useState } from "react";
import { PiCheckBold, PiLinkBold, PiShareNetworkBold } from "react-icons/pi";
import { Button } from "./ui/Button";
import { canShareLink, copyText, shareLink } from "../lib/share";

interface ShareLinkActionsProps {
  url: string;
  /** Shown in the native share sheet. */
  title: string;
  disabled?: boolean;
  /** Stack full-width buttons, for narrow cards. */
  fullWidth?: boolean;
  className?: string;
}

const COPIED_MESSAGE_MS = 2000;

/**
 * Copy Link and (where supported) Share buttons for a passport URL. When the
 * browser refuses clipboard access, the link is shown for manual copying.
 */
export function ShareLinkActions({
  url,
  title,
  disabled = false,
  fullWidth = false,
  className = "",
}: ShareLinkActionsProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const showShare = canShareLink(url);

  useEffect(() => {
    if (status !== "copied") {
      return;
    }
    const timer = window.setTimeout(() => setStatus("idle"), COPIED_MESSAGE_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status === "manual") {
      inputRef.current?.select();
    }
  }, [status]);

  const handleCopy = async () => {
    setStatus((await copyText(url)) ? "copied" : "manual");
  };

  const handleShare = async () => {
    if ((await shareLink({ url, title })) === "failed") {
      setStatus("manual");
    }
  };

  const buttonWidth = fullWidth ? "w-full" : "";

  return (
    <div className={className}>
      <div className={fullWidth ? "space-y-2" : "flex flex-wrap gap-2"}>
        <Button
          variant="outline"
          className={buttonWidth}
          disabled={disabled}
          onClick={handleCopy}
          icon={
            status === "copied" ? (
              <PiCheckBold className="w-4 h-4 text-success-600" />
            ) : (
              <PiLinkBold className="w-4 h-4" />
            )
          }
        >
          {status === "copied" ? "Copied" : "Copy link"}
        </Button>
        {showShare && (
          <Button
            variant="outline"
            className={buttonWidth}
            disabled={disabled}
            onClick={handleShare}
            icon={<PiShareNetworkBold className="w-4 h-4" />}
          >
            Share
          </Button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {status === "copied" ? "Passport link copied to clipboard." : ""}
      </p>

      {status === "manual" && (
        <div className="mt-3 text-left">
          <label
            htmlFor={inputId}
            className="block text-xs text-primary-600 mb-1"
          >
            Copying isn't available here. Select the link and copy it.
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-lg border border-primary-300 bg-white px-3 py-2 font-mono text-xs text-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          />
        </div>
      )}
    </div>
  );
}
