import { NextResponse } from 'next/server'
import { getCached, setCache } from '@/lib/server-cache'

const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_KEY = 'weather:open-meteo'

interface OpenMeteoData {
  hourly?: {
    time: string[]
    temperature_2m: number[]
    relative_humidity_2m: number[]
    apparent_temperature: number[]
    weather_code: number[]
    wind_speed_10m: number[]
    snow_depth?: number[]
    freezing_level_height?: number[]
  }
  daily?: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weather_code: number[]
    snowfall_sum: number[]
  }
}

interface ForecastDay {
  date: string
  tempMax: number
  tempMin: number
  weatherCode: number
  snowfall: number
  description: string
}

function parseCoordinate(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET() {
  try {
    const cached = getCached<unknown>(CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'private, max-age=60' },
      })
    }

    const latitude = parseCoordinate(process.env.WEATHER_LATITUDE)
    const longitude = parseCoordinate(process.env.WEATHER_LONGITUDE)
    const elevationRaw = parseCoordinate(process.env.WEATHER_ELEVATION)
    const elevation = elevationRaw !== null ? Math.round(elevationRaw) : undefined
    const location = process.env.WEATHER_LOCATION?.trim() || undefined

    if (latitude === null || longitude === null) {
      return NextResponse.json(
        { error: 'Météo non configurée (WEATHER_LATITUDE / WEATHER_LONGITUDE)' },
        { status: 503 }
      )
    }

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      hourly:
        'temperature_2m,relative_humidity_2m,apparent_temperature,snow_depth,weather_code,wind_speed_10m,freezing_level_height',
      daily: 'temperature_2m_max,temperature_2m_min,weather_code,snowfall_sum',
      timezone: 'auto',
      forecast_days: '7',
    })
    if (elevation !== undefined) params.set('elevation', String(elevation))

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      next: { revalidate: 300 },
    })
    if (!response.ok) {
      console.warn('Erreur Open-Meteo:', response.status)
      return NextResponse.json({ error: 'Données météo non disponibles' }, { status: 503 })
    }
    const data: OpenMeteoData = await response.json()

    let currentWeather: {
      temperature: number
      description: string
      icon: undefined
      feelsLike: number
      windSpeed: number
      humidity: number
      pressure: undefined
    } | null = null
    let snowDepth = 0
    let freezingLevel: number | null = null

    const hourly = data.hourly
    if (hourly?.time?.length) {
      const i = 0
      snowDepth = hourly.snow_depth?.[i] || 0
      freezingLevel = hourly.freezing_level_height?.[i] ?? null
      currentWeather = {
        temperature: Math.round(hourly.temperature_2m[i]),
        description: getWeatherDescription(hourly.weather_code[i]),
        icon: undefined,
        feelsLike: Math.round(hourly.apparent_temperature[i]),
        windSpeed: Math.round(hourly.wind_speed_10m[i]), // déjà en km/h
        humidity: Math.round(hourly.relative_humidity_2m[i]),
        pressure: undefined,
      }
    }

    let forecastData: ForecastDay[] = []
    let snowForecast7d = 0
    const daily = data.daily
    if (daily?.time?.length) {
      forecastData = daily.time.map((date, index) => ({
        date,
        tempMax: Math.round(daily.temperature_2m_max[index]),
        tempMin: Math.round(daily.temperature_2m_min[index]),
        weatherCode: daily.weather_code[index],
        snowfall: daily.snowfall_sum[index] || 0,
        description: getWeatherDescription(daily.weather_code[index]),
      }))
      snowForecast7d = Math.round(forecastData.reduce((sum, day) => sum + day.snowfall, 0))
    }

    if (!currentWeather && forecastData.length === 0) {
      return NextResponse.json({ error: 'Données météo non disponibles' }, { status: 503 })
    }

    let snowQuality: string | null = null
    if (currentWeather) {
      const temp = currentWeather.temperature
      if (temp > 5) snowQuality = 'Printanière'
      else if (temp > 0) snowQuality = 'Variable'
      else if (temp > -5) snowQuality = 'Compacte'
      else snowQuality = 'Poudreuse'
    }

    const payload = {
      current: currentWeather,
      forecast: forecastData,
      snowDepth, // en mètres
      snowConditions: {
        depth: snowDepth * 100, // en cm pour l'affichage
        freezingLevel,
        forecast7d: snowForecast7d,
        quality: snowQuality,
      },
      location,
      elevation,
      lastUpdated: new Date().toISOString(),
    }
    setCache(CACHE_KEY, payload, WEATHER_CACHE_TTL_MS)
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de la météo:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

// Codes WMO -> descriptions françaises
function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Ciel dégagé',
    1: 'Principalement dégagé',
    2: 'Partiellement nuageux',
    3: 'Couvert',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    53: 'Bruine modérée',
    55: 'Bruine dense',
    56: 'Bruine verglaçante légère',
    57: 'Bruine verglaçante dense',
    61: 'Pluie légère',
    63: 'Pluie modérée',
    65: 'Pluie forte',
    66: 'Pluie verglaçante légère',
    67: 'Pluie verglaçante forte',
    71: 'Chutes de neige légères',
    73: 'Chutes de neige modérées',
    75: 'Chutes de neige fortes',
    77: 'Grains de neige',
    80: 'Averses de pluie légères',
    81: 'Averses de pluie modérées',
    82: 'Averses de pluie fortes',
    85: 'Averses de neige légères',
    86: 'Averses de neige fortes',
    95: 'Orage',
    96: 'Orage avec grêle légère',
    99: 'Orage avec grêle forte',
  }

  return weatherCodes[code] || 'Conditions météo disponibles'
}
