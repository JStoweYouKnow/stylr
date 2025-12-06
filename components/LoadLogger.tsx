"use client";

import { useEffect } from "react";

export default function LoadLogger() {
  useEffect(() => {
    console.log("🚀 Stylr app loaded in browser");
    console.log("Window location:", window.location.href);
    console.log("User agent:", navigator.userAgent);
    console.log("Is Capacitor:", !!(window as any).Capacitor);
  }, []);

  return null;
}

