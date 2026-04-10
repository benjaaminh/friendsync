/**
 * auth with next-auth
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    id?: string;
    username?: string;
    image?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      /**
       * Validates username/password credentials and maps a Prisma user record to a session user.
       */
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!username || !password) return null;

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash); //bcrypt algo
        if (!isValid) return null;

        return {
          id: user.id,
          username: user.username,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    /**
     * Persists the authenticated user id into the JWT token.
     */
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        if ("username" in user && typeof user.username === "string") {
          token.username = user.username;
        }
        if ("image" in user) {
          token.image = (user.image as string | null | undefined) ?? null;
        }
      }

      if (trigger === "update" && session && "image" in session) {
        token.image = (session.image as string | null | undefined) ?? null;
      }

      return token;
    },
    /**
     * Copies the user id from JWT into the session payload sent to the client.
     */
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      if (token.username && typeof token.username === "string") {
        session.user.username = token.username;
      }
      if ("image" in token) {
        session.user.image = (token.image as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
});
