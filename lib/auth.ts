import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // NextAuth v5 requires trustHost for local development
  trustHost: true,

  // Base path for NextAuth routes
  basePath: "/api/auth",

  // Use JWT session strategy (required for credentials provider in v5)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing email or password");
          return null; // Return null instead of throwing for better error handling
        }

        try {
          console.log("Attempting to authenticate user:", credentials.email);

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) {
            // Create new user on signup
            console.log("User not found, creating new user:", credentials.email);
            try {
              const newUser = await prisma.user.create({
                data: {
                  email: credentials.email as string,
                  name: (credentials.email as string).split("@")[0],
                },
              });

              console.log("New user created successfully:", newUser.id);

              return {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name || null,
              };
            } catch (error) {
              console.error("Error creating user:", error);
              return null;
            }
          }

          // For MVP: Accept any password for existing users
          console.log("Existing user found, logging in:", user.id);
          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // Support session updates
      if (trigger === "update") {
        // Refresh user data from database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.email = dbUser.email;
            token.name = dbUser.name;
          }
        } catch (error) {
          console.error("Error updating token:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
      }
      return session;
    },

    // Add redirect callback for better control
    async redirect({ url, baseUrl }) {
      // Allow relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",

  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
});

