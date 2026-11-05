import { redirect } from '@tanstack/react-router'
import { getMyContext } from '#/server/auth'
import type { MyContext } from '#/lib/types'

export async function requireAuthContext(): Promise<MyContext> {
  const ctx = await getMyContext()
  if (!ctx) {
    throw redirect({ to: '/auth' })
  }
  return ctx
}
