"use client";

import { useEffect } from "react";

export default function LoadLogger() {
  useEffect(() => {
    const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
    
    console.log("🚀 Stylr app loaded in browser");
    console.log("Window location:", window.location.href);
    console.log("User agent:", navigator.userAgent);
    console.log("Is Capacitor:", isCapacitor);
    console.log("Document ready state:", document.readyState);
    
    // Hide splash screen manually if in Capacitor
    if (isCapacitor) {
      import('@capacitor/splash-screen').then(({ SplashScreen }) => {
        console.log("Hiding splash screen...");
        SplashScreen.hide().catch(err => console.warn("Splash hide error:", err));
      }).catch(err => console.warn("Could not import SplashScreen:", err));
    }
  }, []);

  return null;
}

