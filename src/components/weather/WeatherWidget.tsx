'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Wind,
  Droplet,
  Thermometer,
  Mountain,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

interface WeatherData {
  current: {
    temperature: number
    description: string
    icon?: string
    feelsLike: number
    windSpeed: number
    humidity: number
    pressure?: number
  }
  forecast: Array<{
    date: string
    tempMax: number
    tempMin: number
    weatherCode: number
    snowfall: number
  }>
  snowDepth: number
  location?: string
}

// Mapping des codes météo WMO vers icônes Lucide
function getWeatherIcon(code: number) {
  const iconProps = { className: 'h-5 w-5', strokeWidth: 1.5 }
  
  // Codes pour ciel dégagé / nuageux
  if (code === 0) return <Sun {...iconProps} />
  if (code === 1) return <Sun {...iconProps} />
  if (code === 2) return <Cloud {...iconProps} />
  if (code === 3) return <Cloud {...iconProps} />
  
  // Codes pour brouillard
  if (code === 45 || code === 48) return <Cloud {...iconProps} />
  
  // Codes pour pluie
  if (code >= 51 && code <= 67) return <CloudRain {...iconProps} />
  
  // Codes pour neige
  if (code >= 71 && code <= 77) return <Snowflake {...iconProps} />
  if (code >= 85 && code <= 86) return <Snowflake {...iconProps} />
  
  // Codes pour averses
  if (code >= 80 && code <= 82) return <CloudRain {...iconProps} />
  
  // Codes pour orage
  if (code >= 95 && code <= 99) return <CloudRain {...iconProps} />
  
  // Par défaut
  return <Cloud {...iconProps} />
}

// Mapping des codes météo vers descriptions (utilisé dans l'API)
function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
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
  return descriptions[code] || 'Conditions météo disponibles'
}

// Obtenir l'icône pour les conditions actuelles (OpenWeatherMap)
function getCurrentWeatherIcon(icon?: string) {
  const iconProps = { className: 'h-8 w-8', strokeWidth: 1.5 }
  
  if (!icon) return <Cloud {...iconProps} />
  
  // Mapping des icônes OpenWeatherMap
  if (icon.includes('01')) return <Sun {...iconProps} /> // clear sky
  if (icon.includes('02')) return <Sun {...iconProps} /> // few clouds
  if (icon.includes('03') || icon.includes('04')) return <Cloud {...iconProps} /> // scattered/broken clouds
  if (icon.includes('09') || icon.includes('10')) return <CloudRain {...iconProps} /> // rain
  if (icon.includes('11')) return <CloudRain {...iconProps} /> // thunderstorm
  if (icon.includes('13')) return <Snowflake {...iconProps} /> // snow
  if (icon.includes('50')) return <Cloud {...iconProps} /> // mist
  
  return <Cloud {...iconProps} />
}

export function WeatherWidget() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWeather()
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(fetchWeather, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchWeather = async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/weather')
      if (response.ok) {
        const data = await response.json()
        setWeatherData(data)
        setError(null)
      } else {
        setError('Données météo non disponibles')
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la météo:', err)
      setError('Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" strokeWidth={1.5} />
            Météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted rounded animate-pulse" />
            <div className="h-16 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !weatherData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" strokeWidth={1.5} />
            Météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || 'Données météo non disponibles'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const formatDateLabel = (dateString: string) => {
    const date = parseISO(dateString)
    if (isToday(date)) return "Aujourd'hui"
    if (isTomorrow(date)) return 'Demain'
    return format(date, 'EEEE', { locale: fr })
  }

  const formatDateShort = (dateString: string) => {
    const date = parseISO(dateString)
    return format(date, 'd MMM', { locale: fr })
  }

  const snowDepthCm = Math.round((weatherData.snowDepth || 0) * 100)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" strokeWidth={1.5} />
          <CardTitle className="text-base">
            Météo{weatherData.location ? ` · ${weatherData.location}` : ''}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Conditions actuelles */}
        {weatherData.current && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                {getCurrentWeatherIcon(weatherData.current.icon)}
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{weatherData.current.temperature}°C</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {weatherData.current.description}
                </p>
              </div>
            </div>

            {/* Détails */}
            <div className="flex items-center justify-end gap-4 pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground">
                  Ressenti {weatherData.current.feelsLike}°
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground">
                  {weatherData.current.windSpeed} km/h
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplet className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground">
                  {weatherData.current.humidity}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Lien vers prévisions */}
        <Link
          href="/meteo"
          className="flex items-center justify-end gap-1 text-sm text-primary hover:text-primary/80 transition-colors pt-1"
        >
          <span>Voir prévisions</span>
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </CardContent>
    </Card>
  )
}

