import { useState, useEffect } from "react";
import { Download, Smartphone, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      setIsIOS(true);
    }

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
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
          {isInstalled ? (
            <Check className="h-10 w-10 text-primary" />
          ) : (
            <Smartphone className="h-10 w-10 text-primary" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isInstalled ? "Already Installed!" : "Install RentEase"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isInstalled
              ? "RentEase is already on your home screen. Open it from there for the best experience."
              : "Add RentEase to your home screen for quick access, offline support, and a native app experience."}
          </p>
        </div>

        {!isInstalled && (
          <>
            {deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Install Now
              </Button>
            ) : isIOS ? (
              <div className="rounded-xl border bg-card p-4 text-left space-y-3">
                <p className="text-sm font-medium text-card-foreground">To install on iPhone/iPad:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Tap the <strong>Share</strong> button (box with arrow) in Safari</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> to confirm</li>
                </ol>
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-4 text-left space-y-3">
                <p className="text-sm font-medium text-card-foreground">To install:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Open this page in <strong>Chrome</strong> or <strong>Edge</strong></li>
                  <li>Tap the <strong>menu (⋮)</strong> button</li>
                  <li>Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
                </ol>
              </div>
            )}
          </>
        )}

        <Button variant="ghost" onClick={() => navigate(-1)} className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default Install;
