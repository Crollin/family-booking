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
  ArrowLeft,
  MapPin,
} from 'lucide-react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
    description?: string
  }>
  snowDepth: number
  snowConditions?: {
    depth: number // en cm
    freezingLevel: number | null // isotherme 0°C en mètres
    forecast7d: number // neige prévue sur 7 jours en cm
    quality: string | null // qualité de neige
  }
  location?: string
  elevation?: number
  lastUpdated?: string
}

// Mapping des codes météo WMO vers icônes Lucide
function getWeatherIcon(code: number) {
  const iconProps = { className: 'h-6 w-6', strokeWidth: 1.5 }
  
  if (code === 0) return <Sun {...iconProps} />
  if (code === 1) return <Sun {...iconProps} />
  if (code === 2) return <Cloud {...iconProps} />
  if (code === 3) return <Cloud {...iconProps} />
  if (code === 45 || code === 48) return <Cloud {...iconProps} />
  if (code >= 51 && code <= 67) return <CloudRain {...iconProps} />
  if (code >= 71 && code <= 77) return <Snowflake {...iconProps} />
  if (code >= 85 && code <= 86) return <Snowflake {...iconProps} />
  if (code >= 80 && code <= 82) return <CloudRain {...iconProps} />
  if (code >= 95 && code <= 99) return <CloudRain {...iconProps} />
  
  return <Cloud {...iconProps} />
}

// Obtenir l'icône pour les conditions actuelles (OpenWeatherMap)
function getCurrentWeatherIcon(icon?: string) {
  const iconProps = { className: 'h-16 w-16', strokeWidth: 1.5 }
  
  if (!icon) return <Cloud {...iconProps} />
  
  if (icon.includes('01')) return <Sun {...iconProps} />
  if (icon.includes('02')) return <Sun {...iconProps} />
  if (icon.includes('03') || icon.includes('04')) return <Cloud {...iconProps} />
  if (icon.includes('09') || icon.includes('10')) return <CloudRain {...iconProps} />
  if (icon.includes('11')) return <CloudRain {...iconProps} />
  if (icon.includes('13')) return <Snowflake {...iconProps} />
  if (icon.includes('50')) return <Cloud {...iconProps} />
  
  return <Cloud {...iconProps} />
}

// Mapping des codes météo vers descriptions
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

export default function MeteoPage() {
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !weatherData) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {error || 'Données météo non disponibles'}
          </p>
        </div>
      </div>
    )
  }

  const snowDepthCm = Math.round(weatherData.snowConditions?.depth || (weatherData.snowDepth || 0) * 100)
  const freezingLevel = weatherData.snowConditions?.freezingLevel
  const snowForecast7d = Math.round(weatherData.snowConditions?.forecast7d || 0)
  const chaletElevation = weatherData.elevation

  // Formater l'heure de mise à jour
  const formatUpdateTime = (dateString?: string) => {
    if (!dateString) return ''
    try {
      const date = parseISO(dateString)
      return format(date, 'HH:mm', { locale: fr })
    } catch {
      return ''
    }
  }

  return (
    <div className="space-y-8">
      {/* Bouton retour */}
      <Link href="/dashboard">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
          Retour à la réservation
        </Button>
      </Link>

      {/* Header */}
      <div className="relative bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-lg p-8 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Cloud className="h-6 w-6 text-blue-700 dark:text-blue-300" strokeWidth={1.5} />
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">
                <Cloud className="h-3 w-3 mr-1" strokeWidth={1.5} />
                Météo en direct
              </Badge>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                Météo{weatherData.location ? ` · ${weatherData.location}` : ''}
              </h1>
            </div>
          </div>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Prévisions météorologiques pour planifier votre séjour au chalet
          </p>
        </div>
        <div className="absolute right-0 top-0 opacity-10 dark:opacity-5">
          <Mountain className="h-64 w-64 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
        </div>
      </div>

      {/* Conditions actuelles et détails */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" strokeWidth={1.5} />
              Conditions actuelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {getCurrentWeatherIcon(weatherData.current?.icon)}
              <div>
                <p className="text-5xl font-bold">{weatherData.current?.temperature}°C</p>
                <p className="text-lg text-muted-foreground capitalize mt-2">
                  {weatherData.current?.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Thermometer className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <p className="text-sm text-muted-foreground">Ressenti</p>
                  <p className="text-lg font-semibold">{weatherData.current?.feelsLike}°C</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Wind className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <p className="text-sm text-muted-foreground">Vent</p>
                  <p className="text-lg font-semibold">{weatherData.current?.windSpeed} km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Droplet className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <p className="text-sm text-muted-foreground">Humidité</p>
                  <p className="text-lg font-semibold">{weatherData.current?.humidity}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mountain className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <p className="text-sm text-muted-foreground">Altitude</p>
                  <p className="text-lg font-semibold">{chaletElevation !== undefined ? `~${chaletElevation}m` : '—'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conditions de neige */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" strokeWidth={1.5} />
            Conditions de neige
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Mountain className="h-8 w-8 text-blue-700 dark:text-blue-300" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted-foreground">Épaisseur au sol</p>
                <p className="text-xl font-bold">{snowDepthCm} cm</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Mountain className="h-8 w-8 text-blue-700 dark:text-blue-300" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted-foreground">Isotherme 0°C</p>
                <p className="text-xl font-bold">
                  {freezingLevel ? `${Math.round(freezingLevel)} m` : 'N/A'}
                </p>
                {freezingLevel && chaletElevation !== undefined && freezingLevel > chaletElevation && (
                  <p className="text-xs text-muted-foreground mt-1">Au-dessus du chalet</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Snowflake className="h-8 w-8 text-blue-700 dark:text-blue-300" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted-foreground">Neige prévue (7j)</p>
                <p className="text-xl font-bold">{snowForecast7d} cm</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prévisions sur 7 jours */}
      <Card>
        <CardHeader>
          <CardTitle>Prévisions sur 7 jours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weatherData.forecast && weatherData.forecast.length > 0 ? (
              weatherData.forecast.slice(0, 7).map((day, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-accent/50 transition-colors border"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {getWeatherIcon(day.weatherCode)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {formatDateLabel(day.date)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateShort(day.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold">{day.tempMax}°</p>
                      <p className="text-sm text-muted-foreground">{day.tempMin}°</p>
                    </div>
                    <div className="text-sm text-muted-foreground capitalize w-32 text-right">
                      {day.description || getWeatherDescription(day.weatherCode)}
                    </div>
                    {day.snowfall > 0 && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <Snowflake className="h-4 w-4" strokeWidth={1.5} />
                        <span>{Math.round(day.snowfall)}cm</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Aucune prévision disponible
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

