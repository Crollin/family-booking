import { formatDate } from './utils'
import { createServiceRoleClient } from './supabase'
import { sendMail } from './mail/send'
import { getPublicUrl } from './runtime-env'
import { getSiteName, getSiteTagline } from './site-branding'

// URL publique du site. Les liens et le logo des e-mails en dépendent : sans
// PUBLIC_URL, ils pointeraient vers une machine locale injoignable pour le
// destinataire.
const baseSiteUrl = getPublicUrl() || 'http://localhost:3000'

// Logo brand (utilisé dans l'en-tête des emails)
const siteName = getSiteName()
const siteTagline = getSiteTagline()
const brandLogoUrl = `${baseSiteUrl}/logo-light.png`

// Palette + tokens dérivés de src/app/globals.css (mode clair)
const emailTheme = {
  colors: {
    background: '#F9F7F6', // --background
    surface: '#FFFFFF', // proche --card
    surfaceAlt: '#FDFBF9', // --card variant
    text: '#20293C', // --foreground
    muted: '#4B5563',
    primary: '#336FB1', // --primary
    secondary: '#BDB328', // --secondary
    accent: '#5FA33D', // --accent / success
    border: '#E5DCCF',
    info: '#2563EB',
    danger: '#DC2626',
    warning: '#F59E0B',
  },
  radius: '12px', // --radius ≈ 0.75rem
  fontStack:
    '"Inter", "Segoe UI", "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
}

const buttonStyle = [
  `background:${emailTheme.colors.primary}`,
  'color:#ffffff',
  'padding:14px 24px',
  'font-weight:700',
  'text-decoration:none',
  `border-radius:${emailTheme.radius}`,
  'display:inline-block',
  'border:1px solid transparent',
  'box-shadow:0 8px 24px rgba(51,111,177,0.18)',
].join(';')

type RenderEmailParams = {
  title: string
  preheader?: string
  content: string
}

function renderEmail({ title, preheader = '', content }: RenderEmailParams) {
  const { colors, radius, fontStack } = emailTheme

  const cardStyle = [
    `background:${colors.surface}`,
    `border:1px solid ${colors.border}`,
    `border-radius:${radius}`,
    'padding:28px',
  ].join(';')

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="margin:0; padding:0; background:${colors.background}; font-family:${fontStack}; color:${colors.text};">
        <div style="max-width:640px; margin:0 auto; padding:32px 20px;">
          <span style="display:none; visibility:hidden; opacity:0; height:0; width:0;">${preheader}</span>
          <div style="text-align:center; margin-bottom:18px;">
            <div style="
              display:inline-flex;
              align-items:center;
              gap:12px;
              padding:12px 18px;
              border-radius:${radius};
              background:linear-gradient(135deg, ${colors.surfaceAlt} 0%, ${colors.background} 100%);
              border:1px solid ${colors.border};
            ">
              <img
                src="${brandLogoUrl}"
                alt="${siteName}"
                width="56"
                height="56"
                style="display:block; width:56px; max-width:100%; height:auto;"
              />
              <div style="text-align:left;">
                <div style="font-weight:800; font-size:18px; color:${colors.primary};">${siteName}</div>
                <div style="font-size:13px; color:${colors.muted};">${siteTagline}</div>
              </div>
            </div>
          </div>
          <div style="${cardStyle}">
            <h1 style="margin:0 0 16px 0; font-size:22px; color:${colors.primary};">${title}</h1>
            <div style="font-size:16px; line-height:1.6; color:${colors.text};">
              ${content}
            </div>
          </div>
          <p style="margin:18px 0 0 0; font-size:12px; color:${colors.muted}; text-align:center;">
            ${siteName} — Veuillez ne pas répondre à cet email automatisé.
          </p>
        </div>
      </body>
    </html>
  `.replace(/\s+$/gm, '')
    .replace(/\n {2,}/g, '\n')
    .trim()
}

export function buildInvitationLink(token: string) {
  return `${baseSiteUrl}/register?token=${token}`
}

export async function sendInvitationEmail(email: string, token: string) {
  const invitationLink = buildInvitationLink(token)
  const content = `
    <p style="margin:0 0 12px 0;">Bonjour,</p>
    <p style="margin:0 0 18px 0;">Vous êtes invité à rejoindre la communauté ${siteName}.</p>
    <p style="margin:26px 0;">
      <a href="${invitationLink}" style="${buttonStyle}" target="_blank" rel="noopener">
        Accepter l'invitation
      </a>
    </p>
    <p style="margin:0 0 10px 0; color:${emailTheme.colors.muted}; font-size:14px;">Ou copiez ce lien dans votre navigateur :</p>
    <p style="margin:0; color:${emailTheme.colors.primary}; font-size:12px; word-break:break-all;">${invitationLink}</p>
    <p style="margin:22px 0 0 0; color:${emailTheme.colors.muted}; font-size:12px;">Ce lien expire dans 7 jours.</p>
  `

  const html = renderEmail({
    title: 'Vous êtes invité(e) !',
    preheader: `Invitation à rejoindre ${siteName}. Lien valable 7 jours.`,
    content,
  })

  const text = [
    `Vous êtes invité à rejoindre ${siteName}.`,
    ``,
    `Lien d'invitation : ${invitationLink}`,
    ``,
    `Ce lien expire dans 7 jours.`,
  ].join('\n')

  await sendMail({
    to: email,
    subject: `Invitation à ${siteName}`,
    html,
    text,
  })
}

export async function sendReservationApproved(
  email: string,
  name: string,
  startDate: Date,
  endDate: Date,
  propertyInfo?: {
    openingTime?: string | null
    closingTime?: string | null
    practicalInfo?: string | null
    opening_time?: string | null
    closing_time?: string | null
    practical_info?: string | null
  }
) {
  // Récupérer les infos pratiques si non fournies
  let info = propertyInfo
  if (info && !info.openingTime && (info as any).opening_time) {
    info = {
      openingTime: (info as any).opening_time,
      closingTime: (info as any).closing_time,
      practicalInfo: (info as any).practical_info,
    }
  }
  if (!info) {
    const supabase = createServiceRoleClient()
    const { data: property } = await supabase
      .from('property_info')
      .select('*')
      .eq('id', 'singleton')
      .single()
    info = property || undefined
  }

  const infoSection =
    info && (info.openingTime || info.closingTime || info.practicalInfo)
      ? `
      <div style="margin:20px 0; padding:18px; border-radius:${emailTheme.radius}; background:${emailTheme.colors.surfaceAlt}; border:1px solid ${emailTheme.colors.border};">
        <h3 style="margin:0 0 10px 0; color:${emailTheme.colors.accent};">Informations pratiques</h3>
        ${
          info.openingTime || info.closingTime
            ? `<p style="margin:4px 0;"><strong>Horaires :</strong> ${info.openingTime || 'N/A'} - ${info.closingTime || 'N/A'}</p>`
            : ''
        }
        ${
          info.practicalInfo
            ? `<div style="margin-top:8px;"><strong>Informations :</strong><div style="margin-top:6px; white-space:pre-wrap;">${info.practicalInfo}</div></div>`
            : ''
        }
      </div>
    `
      : ''

  const content = `
    <p style="margin:0 0 12px 0;">Bonjour ${name},</p>
    <p style="margin:0 0 18px 0;">Bonne nouvelle ! Votre séjour est confirmé.</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.border}; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(startDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(endDate)}</p>
    </div>
    ${infoSection}
    <p style="margin:12px 0 0 0;">Nous vous souhaitons un excellent séjour !</p>
  `

  const html = renderEmail({
    title: 'Réservation approuvée',
    preheader: `Votre séjour du ${formatDate(startDate)} au ${formatDate(endDate)} est confirmé.`,
    content,
  })

  const practicalText =
    info && (info.openingTime || info.closingTime || info.practicalInfo)
      ? `Infos pratiques : ${info.openingTime || 'N/A'} - ${info.closingTime || 'N/A'}${info.practicalInfo ? ` | ${info.practicalInfo}` : ''}`
      : ''

  const text = [
    `Votre séjour est confirmé du ${formatDate(startDate)} au ${formatDate(endDate)}.`,
    practicalText,
  ]
    .filter(Boolean)
    .join('\n')

  await sendMail({ to: email, subject: `Réservation approuvée - ${siteName}`, html, text })
}

export async function sendReservationRejected(
  email: string,
  name: string,
  startDate: Date,
  endDate: Date,
  reason?: string
) {
  const content = `
    <p style="margin:0 0 12px 0;">Bonjour ${name},</p>
    <p style="margin:0 0 18px 0;">Malheureusement, votre demande de réservation a été refusée.</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.danger}33; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(startDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(endDate)}</p>
      ${reason ? `<p style="margin:10px 0 0 0;"><strong>Raison :</strong> ${reason}</p>` : ''}
    </div>
    <p style="margin:12px 0 0 0;">N'hésitez pas à faire une nouvelle demande pour d'autres dates.</p>
  `

  const html = renderEmail({
    title: 'Réservation refusée',
    preheader: 'Votre demande de réservation a été refusée.',
    content,
  })

  const text = [
    `Votre demande du ${formatDate(startDate)} au ${formatDate(endDate)} a été refusée.`,
    reason ? `Raison : ${reason}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  await sendMail({ to: email, subject: `Réservation refusée - ${siteName}`, html, text })
}

export async function sendReservationModifiedNotification(
  email: string,
  name: string,
  newStartDate: Date,
  newEndDate: Date,
  oldStartDate: Date,
  oldEndDate: Date,
  propertyInfo?: {
    openingTime?: string | null
    closingTime?: string | null
    practicalInfo?: string | null
    opening_time?: string | null
    closing_time?: string | null
    practical_info?: string | null
  }
) {
  // Récupérer les infos pratiques si non fournies
  let info = propertyInfo
  if (info && !info.openingTime && (info as any).opening_time) {
    info = {
      openingTime: (info as any).opening_time,
      closingTime: (info as any).closing_time,
      practicalInfo: (info as any).practical_info,
    }
  }
  if (!info) {
    const supabase = createServiceRoleClient()
    const { data: property } = await supabase
      .from('property_info')
      .select('*')
      .eq('id', 'singleton')
      .single()
    info = property || undefined
  }

  const infoSection =
    info && (info.openingTime || info.closingTime || info.practicalInfo)
      ? `
      <div style="margin:20px 0; padding:18px; border-radius:${emailTheme.radius}; background:${emailTheme.colors.surfaceAlt}; border:1px solid ${emailTheme.colors.border};">
        <h3 style="margin:0 0 10px 0; color:${emailTheme.colors.accent};">Informations pratiques</h3>
        ${
          info.openingTime || info.closingTime
            ? `<p style="margin:4px 0;"><strong>Horaires :</strong> ${info.openingTime || 'N/A'} - ${info.closingTime || 'N/A'}</p>`
            : ''
        }
        ${
          info.practicalInfo
            ? `<div style="margin-top:8px;"><strong>Informations :</strong><div style="margin-top:6px; white-space:pre-wrap;">${info.practicalInfo}</div></div>`
            : ''
        }
      </div>
    `
      : ''

  const datesChanged = 
    newStartDate.toISOString() !== oldStartDate.toISOString() ||
    newEndDate.toISOString() !== oldEndDate.toISOString()

  const content = `
    <p style="margin:0 0 12px 0;">Bonjour ${name},</p>
    <p style="margin:0 0 18px 0;">Votre réservation a été modifiée par un administrateur.</p>
    ${datesChanged ? `
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.warning}33; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:0 0 8px 0; font-weight:600; color:${emailTheme.colors.warning};">Anciennes dates :</p>
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(oldStartDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(oldEndDate)}</p>
    </div>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.primary}33; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:0 0 8px 0; font-weight:600; color:${emailTheme.colors.primary};">Nouvelles dates :</p>
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(newStartDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(newEndDate)}</p>
    </div>
    ` : `
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.border}; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(newStartDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(newEndDate)}</p>
    </div>
    `}
    ${infoSection}
    <p style="margin:12px 0 0 0;">Si vous avez des questions concernant cette modification, n'hésitez pas à nous contacter.</p>
  `

  const html = renderEmail({
    title: 'Réservation modifiée',
    preheader: `Votre réservation a été modifiée. Nouvelles dates : ${formatDate(newStartDate)} - ${formatDate(newEndDate)}.`,
    content,
  })

  const practicalText =
    info && (info.openingTime || info.closingTime || info.practicalInfo)
      ? `Infos pratiques : ${info.openingTime || 'N/A'} - ${info.closingTime || 'N/A'}${info.practicalInfo ? ` | ${info.practicalInfo}` : ''}`
      : ''

  const text = [
    `Votre réservation a été modifiée par un administrateur.`,
    datesChanged ? `Anciennes dates : ${formatDate(oldStartDate)} - ${formatDate(oldEndDate)}` : '',
    `Nouvelles dates : ${formatDate(newStartDate)} - ${formatDate(newEndDate)}`,
    practicalText,
  ]
    .filter(Boolean)
    .join('\n')

  await sendMail({ to: email, subject: `Réservation modifiée - ${siteName}`, html, text })
}

// Interface pour les informations météo
interface WeatherInfo {
  temperature: number
  description: string
  icon?: string
}

// Fonction pour récupérer la météo locale
export async function getWeatherInfo(
  location: string,
  apiKey?: string
): Promise<WeatherInfo | null> {
  if (!apiKey || !location) {
    return null
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=fr`
    const response = await fetch(url)

    if (!response.ok) {
      console.warn('Erreur API météo:', response.status)
      return null
    }

    const data = await response.json()
    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0]?.description || 'Conditions météo disponibles',
      icon: data.weather[0]?.icon || undefined,
    }
  } catch (error) {
    console.warn('Erreur lors de la récupération de la météo:', error)
    return null
  }
}

export async function sendReservationReminder(
  email: string,
  name: string,
  startDate: Date,
  endDate: Date,
  propertyInfo?: {
    openingTime?: string | null
    closingTime?: string | null
    practicalInfo?: string | null
    opening_time?: string | null
    closing_time?: string | null
    practical_info?: string | null
  },
  weatherInfo?: WeatherInfo | null
) {
  // Récupérer les infos pratiques si non fournies
  let info = propertyInfo
  if (info && !info.openingTime && (info as any).opening_time) {
    info = {
      openingTime: (info as any).opening_time,
      closingTime: (info as any).closing_time,
      practicalInfo: (info as any).practical_info,
    }
  }
  if (!info) {
    const supabase = createServiceRoleClient()
    const { data: property } = await supabase
      .from('property_info')
      .select('*')
      .eq('id', 'singleton')
      .single()
    info = property || undefined
  }

  // Checklist d'ouverture
  const checklist = `
    <div style="margin:18px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.info}33; background:${emailTheme.colors.surfaceAlt};">
      <h3 style="margin:0 0 10px 0; color:${emailTheme.colors.info};">Checklist d'ouverture</h3>
      <ul style="margin:10px 0; padding-left:20px;">
        <li style="margin:5px 0;">Vérifier l'ouverture des volets</li>
        <li style="margin:5px 0;">Vérifier le système de chauffage</li>
        <li style="margin:5px 0;">Vérifier l'eau et l'électricité</li>
        <li style="margin:5px 0;">Vérifier les clés d'accès</li>
        <li style="margin:5px 0;">Vérifier l'état général des lieux</li>
      </ul>
    </div>
  `

  // Section infos pratiques
  const infoSection =
    info && (info.openingTime || info.closingTime || info.practicalInfo)
      ? `
      <div style="margin:18px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.primary}33; background:${emailTheme.colors.surfaceAlt};">
        <h3 style="margin:0 0 10px 0; color:${emailTheme.colors.primary};">Informations pratiques</h3>
        ${
          info.openingTime || info.closingTime
            ? `<p style="margin:5px 0;"><strong>Horaires :</strong> ${info.openingTime || 'N/A'} - ${info.closingTime || 'N/A'}</p>`
            : ''
        }
        ${
          info.practicalInfo
            ? `<div style="margin-top:8px;"><strong>Informations :</strong><div style="margin-top:6px; white-space: pre-wrap;">${info.practicalInfo}</div></div>`
            : ''
        }
      </div>
    `
      : ''

  // Section météo
  let weatherSection = ''
  if (weatherInfo) {
    const iconUrl = weatherInfo.icon
      ? `https://openweathermap.org/img/wn/${weatherInfo.icon}@2x.png`
      : ''
    weatherSection = `
      <div style="margin:18px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.info}33; background:${emailTheme.colors.surfaceAlt};">
        <h3 style="margin:0 0 10px 0; color:${emailTheme.colors.info};">Météo locale</h3>
        <div style="display:flex; align-items:center; gap:10px;">
          ${iconUrl ? `<img src="${iconUrl}" alt="Météo" style="width:50px; height:50px;" />` : ''}
          <div>
            <p style="margin:5px 0; font-size:18px;"><strong>${weatherInfo.temperature}°C</strong></p>
            <p style="margin:5px 0; color:${emailTheme.colors.muted}; text-transform:capitalize;">${weatherInfo.description}</p>
          </div>
        </div>
      </div>
    `
  }

  const content = `
    <p style="margin:0 0 12px 0;">Bonjour ${name},</p>
    <p style="margin:0 0 18px 0;">Votre séjour approche ! Voici les informations utiles.</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.border}; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(startDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(endDate)}</p>
    </div>
    ${checklist}
    ${infoSection}
    ${weatherSection}
    <p style="margin:12px 0 0 0;">Nous avons hâte de vous accueillir !</p>
  `

  const html = renderEmail({
    title: 'Rappel de réservation',
    preheader: `Votre séjour du ${formatDate(startDate)} au ${formatDate(endDate)} approche.`,
    content,
  })

  const practicalText =
    info && (info.openingTime || info.closingTime || info.practicalInfo)
      ? `Infos pratiques : ${info.openingTime || 'N/A'} - ${info.closingTime || 'N/A'}${info.practicalInfo ? ` | ${info.practicalInfo}` : ''}`
      : ''

  const weatherText = weatherInfo
    ? `Météo locale : ${weatherInfo.temperature}°C, ${weatherInfo.description}`
    : ''

  const text = [
    `Rappel : votre séjour du ${formatDate(startDate)} au ${formatDate(endDate)} approche.`,
    practicalText,
    weatherText,
  ]
    .filter(Boolean)
    .join('\n')

  await sendMail({ to: email, subject: `Rappel : Votre séjour approche - ${siteName}`, html, text })
}

export async function sendNewReservationNotification(
  adminEmail: string,
  userName: string,
  startDate: Date,
  endDate: Date
) {
  const content = `
    <p style="margin:0 0 12px 0;">Bonjour,</p>
    <p style="margin:0 0 16px 0;">Une nouvelle demande de réservation nécessite votre attention.</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.warning}33; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Membre :</strong> ${userName}</p>
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(startDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(endDate)}</p>
    </div>
    <p style="margin:22px 0;">
      <a href="${baseSiteUrl}/admin" style="${buttonStyle}" target="_blank" rel="noopener">
        Voir la demande
      </a>
    </p>
  `

  const html = renderEmail({
    title: 'Nouvelle demande de réservation',
    preheader: `Demande pour ${formatDate(startDate)} - ${formatDate(endDate)} par ${userName}.`,
    content,
  })

  const text = [
    `Nouvelle demande de réservation.`,
    `Membre : ${userName}`,
    `Arrivée : ${formatDate(startDate)}`,
    `Départ : ${formatDate(endDate)}`,
    `Dashboard : ${baseSiteUrl}/admin`,
  ].join('\n')

  await sendMail({ to: adminEmail, subject: `Nouvelle demande de réservation - ${siteName}`, html, text })
}

export async function sendReservationConfirmation(
  email: string,
  name: string,
  startDate: Date,
  endDate: Date
) {
  const content = `
    <p style="margin:0 0 12px 0;">Bonjour ${name},</p>
    <p style="margin:0 0 16px 0;">Votre demande du ${formatDate(startDate)} au ${formatDate(endDate)} a été soumise et est en attente de validation.</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.primary}33; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(startDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(endDate)}</p>
    </div>
    <p style="margin:12px 0 0 0;">Vous recevrez une notification dès que votre demande sera traitée.</p>
  `

  const html = renderEmail({
    title: 'Confirmation de demande',
    preheader: `Demande du ${formatDate(startDate)} au ${formatDate(endDate)} en attente de validation.`,
    content,
  })

  const text = [
    `Votre demande du ${formatDate(startDate)} au ${formatDate(endDate)} est soumise et en attente de validation.`,
  ].join('\n')

  await sendMail({ to: email, subject: `Confirmation de demande - ${siteName}`, html, text })
}

export async function sendReservationCancellationConfirmation(
  email: string,
  name: string,
  startDate: Date,
  endDate: Date
) {
  const content = `
    <p style="margin:0 0 12px 0;">Bonjour ${name},</p>
    <p style="margin:0 0 16px 0;">Votre réservation du ${formatDate(startDate)} au ${formatDate(endDate)} a bien été annulée.</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.muted}33; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(startDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(endDate)}</p>
    </div>
    <p style="margin:12px 0 0 0;">N'hésitez pas à faire une nouvelle réservation si vous le souhaitez.</p>
  `

  const html = renderEmail({
    title: 'Réservation annulée',
    preheader: `Votre réservation du ${formatDate(startDate)} au ${formatDate(endDate)} est annulée.`,
    content,
  })

  const text = [
    `Votre réservation du ${formatDate(startDate)} au ${formatDate(endDate)} a été annulée.`,
  ].join('\n')

  await sendMail({ to: email, subject: `Réservation annulée - ${siteName}`, html, text })
}

export async function sendMemberCancellationNotification(
  adminEmail: string,
  memberName: string,
  startDate: Date,
  endDate: Date
) {
  const content = `
    <p style="margin:0 0 12px 0;">Bonjour,</p>
    <p style="margin:0 0 16px 0;">${memberName} a annulé sa réservation.</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.warning}33; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Membre :</strong> ${memberName}</p>
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(startDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(endDate)}</p>
    </div>
    <p style="margin:22px 0;">
      <a href="${baseSiteUrl}/admin" style="${buttonStyle}" target="_blank" rel="noopener">
        Voir le dashboard
      </a>
    </p>
  `

  const html = renderEmail({
    title: 'Annulation de réservation',
    preheader: `${memberName} a annulé son séjour du ${formatDate(startDate)} au ${formatDate(endDate)}.`,
    content,
  })

  const text = [
    `${memberName} a annulé sa réservation.`,
    `Arrivée : ${formatDate(startDate)}`,
    `Départ : ${formatDate(endDate)}`,
    `Dashboard : ${baseSiteUrl}/admin`,
  ].join('\n')

  await sendMail({ to: adminEmail, subject: `Annulation de réservation - ${siteName}`, html, text })
}

export async function sendPasswordSetupEmail(email: string, token: string, name?: string | null) {
  const setupLink = `${baseSiteUrl}/set-password?token=${token}`

  const content = `
    <p style="margin:0 0 12px 0;">Bonjour${name ? ` ${name}` : ''},</p>
    <p style="margin:0 0 16px 0;">Votre compte a été créé sur ${siteName}. Pour finaliser votre inscription, définissez votre mot de passe.</p>
    <p style="margin:22px 0;">
      <a href="${setupLink}" style="${buttonStyle}" target="_blank" rel="noopener">
        Définir mon mot de passe
      </a>
    </p>
    <p style="margin:0 0 8px 0; color:${emailTheme.colors.muted}; font-size:14px;">Ou copiez ce lien dans votre navigateur :</p>
    <p style="margin:0; color:${emailTheme.colors.primary}; font-size:12px; word-break:break-all;">${setupLink}</p>
    <p style="margin:18px 0 0 0; color:${emailTheme.colors.muted}; font-size:12px;">Ce lien expire dans 7 jours.</p>
    <p style="margin:6px 0 0 0; color:${emailTheme.colors.muted}; font-size:12px;">Si vous n'avez pas demandé la création de ce compte, vous pouvez ignorer cet email.</p>
  `

  const html = renderEmail({
    title: 'Définir votre mot de passe',
    preheader: 'Finalisez votre inscription en définissant votre mot de passe.',
    content,
  })

  const text = [
    `Votre compte ${siteName} est créé.`,
    `Définir le mot de passe : ${setupLink}`,
    `Lien valable 7 jours.`,
  ].join('\n')

  await sendMail({ to: email, subject: `Définir votre mot de passe - ${siteName}`, html, text })
}

export async function sendCancellationNotification(
  email: string,
  name: string,
  startDate: Date,
  endDate: Date,
  isAdmin: boolean = false
) {
  const content = `
    <p style="margin:0 0 12px 0;">Bonjour ${name},</p>
    <p style="margin:0 0 16px 0;">${isAdmin ? 'Une réservation a été annulée.' : 'Votre réservation a été annulée.'}</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.muted}33; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(startDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(endDate)}</p>
    </div>
  `

  const html = renderEmail({
    title: 'Réservation annulée',
    preheader: `${isAdmin ? 'Une réservation' : 'Votre réservation'} du ${formatDate(startDate)} au ${formatDate(endDate)} a été annulée.`,
    content,
  })

  const text = [
    `${isAdmin ? 'Une réservation' : 'Votre réservation'} a été annulée.`,
    `Arrivée : ${formatDate(startDate)}`,
    `Départ : ${formatDate(endDate)}`,
  ]
    .filter(Boolean)
    .join('\n')

  await sendMail({ to: email, subject: `Réservation annulée - ${siteName}`, html, text })
}

export async function sendGuestbookInvitation(
  email: string,
  name: string,
  reservationId: string,
  startDate: Date,
  endDate: Date
) {
  const invitationLink = `${baseSiteUrl}/livre-dor?reservationId=${reservationId}`
  
  const content = `
    <p style="margin:0 0 12px 0;">Bonjour ${name},</p>
    <p style="margin:0 0 18px 0;">Votre séjour à ${siteName} s'est terminé. Nous espérons que vous avez passé un excellent moment !</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.primary}33; background:${emailTheme.colors.surfaceAlt};">
      <p style="margin:4px 0;"><strong>Date d'arrivée :</strong> ${formatDate(startDate)}</p>
      <p style="margin:4px 0;"><strong>Date de départ :</strong> ${formatDate(endDate)}</p>
    </div>
    <p style="margin:18px 0;">Partagez vos meilleurs souvenirs avec la famille en ajoutant une entrée dans notre Livre d'Or. Vous pourrez y ajouter vos photos et raconter vos moments préférés.</p>
    <p style="margin:22px 0;">
      <a href="${invitationLink}" style="${buttonStyle}" target="_blank" rel="noopener">
        Ajouter un souvenir
      </a>
    </p>
    <p style="margin:0 0 10px 0; color:${emailTheme.colors.muted}; font-size:14px;">Ou copiez ce lien dans votre navigateur :</p>
    <p style="margin:0; color:${emailTheme.colors.primary}; font-size:12px; word-break:break-all;">${invitationLink}</p>
    <p style="margin:18px 0 0 0; color:${emailTheme.colors.muted}; font-size:12px;">Merci de partager vos souvenirs avec nous !</p>
  `

  const html = renderEmail({
    title: 'Partagez vos souvenirs',
    preheader: `Ajoutez vos souvenirs du séjour du ${formatDate(startDate)} au ${formatDate(endDate)} dans le Livre d'Or.`,
    content,
  })

  const text = [
    `Votre séjour à ${siteName} s'est terminé.`,
    ``,
    `Partagez vos meilleurs souvenirs avec la famille en ajoutant une entrée dans notre Livre d'Or.`,
    ``,
    `Lien : ${invitationLink}`,
    ``,
    `Arrivée : ${formatDate(startDate)}`,
    `Départ : ${formatDate(endDate)}`,
  ].join('\n')

  await sendMail({ to: email, subject: `Partagez vos souvenirs - Livre d'Or ${siteName}`, html, text })
}

export async function sendNewGuestbookEntryNotification(
  email: string,
  name: string,
  authorName: string,
  messagePreview: string,
  stayPeriod?: string | null
) {
  const guestbookLink = `${baseSiteUrl}/livre-dor`
  
  // Prévisualiser le message (premiers 150 caractères)
  const truncatedMessage = messagePreview.length > 150 
    ? messagePreview.substring(0, 150) + '...'
    : messagePreview

  const stayPeriodSection = stayPeriod
    ? `<p style="margin:4px 0;"><strong>Période :</strong> ${stayPeriod}</p>`
    : ''

  const content = `
    <p style="margin:0 0 12px 0;">Bonjour ${name},</p>
    <p style="margin:0 0 18px 0;">Un nouveau souvenir a été partagé dans le Livre d'Or par ${authorName} !</p>
    <div style="margin:16px 0; padding:16px; border-radius:${emailTheme.radius}; border:1px solid ${emailTheme.colors.primary}33; background:${emailTheme.colors.surfaceAlt};">
      ${stayPeriodSection}
      <p style="margin:10px 0 0 0;"><strong>Message :</strong></p>
      <p style="margin:8px 0; color:${emailTheme.colors.text}; font-style:italic;">"${truncatedMessage}"</p>
    </div>
    <p style="margin:18px 0;">Découvrez ce nouveau souvenir et tous les autres partagés par la famille.</p>
    <p style="margin:22px 0;">
      <a href="${guestbookLink}" style="${buttonStyle}" target="_blank" rel="noopener">
        Voir le Livre d'Or
      </a>
    </p>
    <p style="margin:0 0 10px 0; color:${emailTheme.colors.muted}; font-size:14px;">Ou copiez ce lien dans votre navigateur :</p>
    <p style="margin:0; color:${emailTheme.colors.primary}; font-size:12px; word-break:break-all;">${guestbookLink}</p>
  `

  const html = renderEmail({
    title: 'Nouveau souvenir partagé',
    preheader: `${authorName} a partagé un nouveau souvenir dans le Livre d'Or.`,
    content,
  })

  const text = [
    `Un nouveau souvenir a été partagé dans le Livre d'Or par ${authorName} !`,
    ``,
    stayPeriod ? `Période : ${stayPeriod}` : '',
    `Message : "${truncatedMessage}"`,
    ``,
    `Découvrez ce nouveau souvenir : ${guestbookLink}`,
  ]
    .filter(Boolean)
    .join('\n')

  await sendMail({ to: email, subject: `Nouveau souvenir partagé - Livre d'Or ${siteName}`, html, text })
}

export async function notifyMembersOfNewGuestbookEntry(params: {
  authorId: string
  authorName: string
  message: string
  stayPeriod?: string | null
}) {
  const supabase = createServiceRoleClient()
  const { data: members, error } = await supabase
    .from('users')
    .select('id, email, name')
    .neq('id', params.authorId)

  if (error) {
    throw new Error(`Impossible de charger les membres à notifier: ${error.message}`)
  }

  const recipients = (members ?? []).filter(
    (member): member is { id: string; email: string; name: string | null } =>
      typeof member.email === 'string' && member.email.length > 0
  )

  const results = await Promise.allSettled(
    recipients.map((member) =>
      sendNewGuestbookEntryNotification(
        member.email,
        member.name || member.email,
        params.authorName,
        params.message,
        params.stayPeriod
      )
    )
  )

  const failed = results.filter((result) => result.status === 'rejected')
  if (failed.length > 0) {
    console.error(
      `Notifications livre d'or: ${failed.length}/${recipients.length} envoi(s) en échec`
    )
  }
}
