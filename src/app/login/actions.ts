'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { safeCallbackUrl } from '@/lib/safe-callback-url'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function login(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  const callbackUrl = safeCallbackUrl(formData.get('callbackUrl') as string | null)
  redirect(callbackUrl)
}

