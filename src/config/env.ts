import { z } from 'zod'

const schema = z.object({
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  VITE_API_URL: z.string().default(''),
  VITE_APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  VITE_VAPID_PUBLIC_KEY: z.string().default(''),
})

function loadEnv() {
  const result = schema.safeParse(import.meta.env)
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    const message = Object.entries(errors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${message}`)
  }
  return result.data
}

export const env = loadEnv()
