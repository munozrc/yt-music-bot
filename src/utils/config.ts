import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is missing in .env"),
  CLIENT_ID: z.string().min(1, "CLIENT_ID is missing in .env"),
  SERVER_ID: z.string().min(1, "SERVER_ID is missing in .env"),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;
