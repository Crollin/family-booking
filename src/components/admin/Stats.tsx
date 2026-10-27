'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReservationStatus } from '@/types'

interface StatsData {
  totalReservations: number
  pendingReservations: number
  approvedReservations: number
  totalMembers: number
  occupancyRate: number
}

export function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const [reservationsRes, membersRes] = await Promise.all([
        apiGet('/api/reservations'),
        apiGet('/api/members'),
      ])

      if (reservationsRes.ok && membersRes.ok) {
        const reservations = await reservationsRes.json()
        const members = await membersRes.json()

        const totalReservations = reservations.length
        const pendingReservations = reservations.filter(
          (r: any) => r.status === ReservationStatus.PENDING
        ).length
        const approvedReservations = reservations.filter(
          (r: any) => r.status === ReservationStatus.APPROVED
        ).length
        const totalMembers = members.length

        // Calcul simple du taux d'occupation (approximatif)
        const currentYear = new Date().getFullYear()
        const yearReservations = reservations.filter((r: any) => {
          const year = new Date(r.startDate).getFullYear()
          return year === currentYear && r.status === ReservationStatus.APPROVED
        })

        const totalDays = yearReservations.reduce((acc: number, r: any) => {
          const start = new Date(r.startDate)
          const end = new Date(r.endDate)
          const diffTime = Math.abs(end.getTime() - start.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return acc + diffDays
        }, 0)

        const occupancyRate = totalDays > 0 ? Math.round((totalDays / 365) * 100) : 0

        setStats({
          totalReservations,
          pendingReservations,
          approvedReservations,
          totalMembers,
          occupancyRate,
        })
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Chargement des statistiques...</div>
  }

  if (!stats) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Membres actifs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMembers}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            En attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">
            {stats.pendingReservations}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Confirmées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {stats.approvedReservations}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Taux d&apos;occupation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
        </CardContent>
      </Card>
    </div>
  )
}

