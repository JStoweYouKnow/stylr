"use client";

import { SessionProvider } from "next-auth/react";
import DeepLinkHandler from "@/components/DeepLinkHandler";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchInterval={0}
      refetchOnWindowFocus={true}
    >
      <DeepLinkHandler />
      {children}
    </SessionProvider>
  );
}











