import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

