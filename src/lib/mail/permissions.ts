export function getPlatformOwnerEmails(): string[] {
  const raw = process.env.PLATFORM_OWNER_EMAILS?.trim()
  if (!raw) {
    return []
  }

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function canTriggerEmailTest(actorEmail: string): boolean {
  const allowlist = getPlatformOwnerEmails()
  if (allowlist.length === 0) {
    return true
  }

  return allowlist.includes(actorEmail.trim().toLowerCase())
}
