import { Prisma } from "@prisma/client";

/**
 * Handles Prisma database errors gracefully
 * Returns a user-friendly error message and HTTP status code
 */
export function handleDatabaseError(error: unknown): {
  message: string;
  status: number;
} {
  // Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return {
          message: "A record with this value already exists",
          status: 409,
        };
      case "P2025":
        return {
          message: "Record not found",
          status: 404,
        };
      case "P2003":
        return {
          message: "Invalid reference to related record",
          status: 400,
        };
      case "P2014":
        return {
          message: "Invalid relation operation",
          status: 400,
        };
      default:
        console.error("Prisma error:", error);
        return {
          message: "Database operation failed",
          status: 500,
        };
    }
  }

  // Connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("Database connection error:", error);
    return {
      message: "Database connection failed. Please try again.",
      status: 503,
    };
  }

  // Request timeout
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    console.error("Database panic error:", error);
    return {
      message: "Database operation timed out. Please try again.",
      status: 504,
    };
  }

  // Unknown errors
  if (error instanceof Error) {
    // Check for connection closed errors
    if (
      error.message.includes("Closed") ||
      error.message.includes("connection") ||
      error.message.includes("ECONNREFUSED")
    ) {
      console.error("Database connection error:", error);
      return {
        message: "Database connection lost. Please try again.",
        status: 503,
      };
    }
    console.error("Database error:", error);
    return {
      message: error.message || "An unexpected error occurred",
      status: 500,
    };
  }

  console.error("Unknown database error:", error);
  return {
    message: "An unexpected error occurred",
    status: 500,
  };
}

/**
 * Wraps a database operation with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const { message, status } = handleDatabaseError(error);
    throw new Error(message);
  }
}










