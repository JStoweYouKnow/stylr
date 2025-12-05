import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validate DATABASE_URL before creating Prisma client
function validateDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please configure it in your environment variables."
    );
  }
  
  // Check if URL starts with correct protocol
  if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    throw new Error(
      `Invalid DATABASE_URL format. URL must start with 'postgresql://' or 'postgres://'. Current value starts with: ${dbUrl.substring(0, 20)}...`
    );
  }
}

// Validate on module load (only in Node.js runtime)
try {
  if (typeof process !== "undefined" && process.env) {
    validateDatabaseUrl();
  }
} catch (error) {
  console.error("Database configuration error:", error);
  // Don't throw here - let Prisma handle it with a better error message
}

// Enhanced Prisma client configuration for Neon (serverless PostgreSQL)
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",
  });

// Handle connection errors gracefully with retry logic
async function connectWithRetry(retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      return;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      } else {
        console.error("Failed to connect to database after all retries");
        throw error;
      }
    }
  }
}

// Connect on initialization (non-blocking, skip in Edge Runtime)
// Use try-catch to safely check for Node.js runtime without triggering Edge Runtime errors
let isNodeRuntime = false;
try {
  // Check for Node.js runtime without directly accessing process.versions
  isNodeRuntime = typeof process !== "undefined" && 
                  typeof (process as any).on === "function" &&
                  !!(process as any).versions;
} catch {
  // Edge Runtime - skip Node.js-specific code
  isNodeRuntime = false;
}

if (process.env.NODE_ENV !== "production" && isNodeRuntime) {
  connectWithRetry().catch(console.error);
}

// Handle disconnection on process termination (only in Node.js runtime)
// Wrapped in try-catch to avoid Edge Runtime static analysis errors
try {
  if (isNodeRuntime) {
    const gracefulShutdown = async () => {
      try {
        await prisma.$disconnect();
      } catch (error) {
        console.error("Error disconnecting from database:", error);
      }
    };

    const proc = process as any;
    if (proc.on) {
      proc.on("beforeExit", gracefulShutdown);
      proc.on("SIGINT", gracefulShutdown);
      proc.on("SIGTERM", gracefulShutdown);
    }
  }
} catch {
  // Silently fail in Edge Runtime - process.on is not available
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

