import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallBanner = () => {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem("rw_install_dismissed")) return;

    setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem("rw_install_dismissed", "1");
  };

  if (!visible) return null;

  return (
    <div className="relative border-b bg-primary/5 px-4 py-2.5 text-center text-sm text-primary">
      {deferredPrompt ? (
        <button onClick={handleInstall} className="inline-flex items-center gap-1.5 font-medium hover:underline">
          <Download className="h-3.5 w-3.5" />
          Install RentWise for quick access
        </button>
      ) : (
        <Link to="/install" className="inline-flex items-center gap-1.5 font-medium hover:underline">
          📱 <strong>Add to Home Screen</strong> for quick access
        </Link>
      )}
      <button onClick={dismiss} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-primary/60 hover:text-primary">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default InstallBanner;
