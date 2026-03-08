/**
 * NextAuth route entry that exposes GET and POST auth handlers.
 */
import { handlers } from "@/lib/auth";

/**
 * NextAuth HTTP handlers exposed as route segment exports.
 */
export const { GET, POST } = handlers;
