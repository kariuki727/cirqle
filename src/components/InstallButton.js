import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Listen for the beforeinstallprompt event to capture the install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if the app is already installed
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  // Handle the install button click
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // Clear the prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 mx-auto max-w-md bg-white rounded-xl shadow-lg p-4 z-50 border border-primary animate-slide-up glow-effect">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faDownload} className="text-highlight h-5 w-5 mr-3" />
          <div>
            <p className="text-primary font-roboto font-bold text-lg">Install Earn to M-Pesa</p>
            <p className="text-primary font-roboto text-sm">Download for free and start earning up to KSh 100,000!</p>
          </div>
        </div>
        <button
          className="bg-highlight text-white px-4 py-2 rounded-full font-roboto text-sm font-medium shadow-md hover:bg-accent hover:shadow-lg transform hover:scale-105 active:scale-95 transition duration-300"
          onClick={handleInstallClick}
          aria-label="Install Earn to M-Pesa app for free"
        >
          Install
        </button>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes glow {
          0% {
            box-shadow: 0 0 5px rgba(26, 60, 52, 0.5), 0 0 10px rgba(26, 60, 52, 0.3), 0 0 15px rgba(26, 60, 52, 0.2);
          }
          50% {
            box-shadow: 0 0 10px rgba(26, 60, 52, 0.7), 0 0 20px rgba(26, 60, 52, 0.5), 0 0 30px rgba(26, 60, 52, 0.3);
          }
          100% {
            box-shadow: 0 0 5px rgba(26, 60, 52, 0.5), 0 0 10px rgba(26, 60, 52, 0.3), 0 0 15px rgba(26, 60, 52, 0.2);
          }
        }
        .glow-effect {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default InstallButton;