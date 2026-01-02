import { auth } from "./auth"
import { UserRole } from "@prisma/client"

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== UserRole.ADMIN) {
    throw new Error("Forbidden")
  }
  return user
}

