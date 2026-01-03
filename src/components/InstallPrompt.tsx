import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user has dismissed the prompt permanently
    const isDismissedPermanently = localStorage.getItem("pwa-install-dismissed") === "true";
    if (isDismissedPermanently) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem("pwa-install-dismissed", "true");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  const handleNeverShow = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if already installed or no install prompt available
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Install Auro Connect</DialogTitle>
          <DialogDescription className="text-center">
            Install our app for quick access, offline functionality, and a better experience!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 text-sm">
            <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
            <span>Access your duty roster anytime, even offline</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
            <span>Faster loading and native app experience</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
            <span>Push notifications for important updates</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleInstallClick} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Install Now
          </Button>
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleDismiss} className="flex-1">
              Later
            </Button>
            <Button variant="ghost" onClick={handleNeverShow} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Don't Ask Again
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
