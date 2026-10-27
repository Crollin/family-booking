type UserIdentity = {
  name?: string | null
  email?: string | null
}

export function getUserInitials(user?: UserIdentity | null): string {
  if (user?.name) {
    return user.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return user?.email?.[0]?.toUpperCase() || 'U'
}
