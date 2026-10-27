import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { ReservationStatus } from '@/types'
import { sendReservationReminder, getWeatherInfo } from '@/lib/email'
import { addDays } from 'date-fns'

// Cette route peut être appelée par un cron job externe (Vercel Cron, GitHub Actions, etc.)
// Pour l'activer, créez un cron qui appelle cette route quotidiennement
// Exemple avec Vercel : ajoutez dans vercel.json :
// {
//   "crons": [{
//     "path": "/api/cron/reminders",
//     "schedule": "0 9 * * *"
//   }]
// }

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const threeDaysFromNow = addDays(today, 3)

    // Trouver les réservations qui commencent dans 3 jours
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        *,
        user:users!reservations_user_id_fkey(email, name)
      `)
      .eq('status', ReservationStatus.APPROVED)
      .gte('start_date', today.toISOString())
      .lte('start_date', threeDaysFromNow.toISOString())

    if (reservationsError) {
      throw reservationsError
    }

    // Récupérer les infos pratiques
    const { data: propertyInfo } = await supabase
      .from('property_info')
      .select('*')
      .eq('id', 'singleton')
      .single()

    // Récupérer la météo si configurée
    const weatherApiKey = process.env.WEATHER_API_KEY
    const weatherLocation = process.env.WEATHER_LOCATION
    let weatherInfo = null
    if (weatherApiKey && weatherLocation) {
      try {
        weatherInfo = await getWeatherInfo(weatherLocation, weatherApiKey)
      } catch (error) {
        console.warn('Erreur lors de la récupération de la météo:', error)
      }
    }

    let sentCount = 0
    const errors: string[] = []

    if (reservations) {
      for (const reservation of reservations) {
        try {
          await sendReservationReminder(
            reservation.user.email,
            reservation.user.name || reservation.user.email,
            new Date(reservation.start_date),
            new Date(reservation.end_date),
            (propertyInfo as any) || undefined,
            weatherInfo
          )
          sentCount++
        } catch (error: any) {
          errors.push(`Erreur pour la réservation ${reservation.id}: ${error.message}`)
          console.error(`Erreur lors de l'envoi du rappel pour la réservation ${reservation.id}:`, error)
        }
      }
    }

    return NextResponse.json({
      message: 'Rappels envoyés',
      sent: sentCount,
      total: reservations?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi des rappels:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
