export function assertNoError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message)
  }
}

export function mapReservationRpcError(error: {
  code?: string
  message?: string
}): { status: number; message: string } {
  const msg = error.message || ''
  if (error.code === '23P01' || msg.includes('OVERLAP') || msg.includes('reservations_approved_no_overlap')) {
    return {
      status: 400,
      message: 'Ces dates chevauchent avec une réservation déjà confirmée',
    }
  }
  if (msg.includes('FORBIDDEN') || msg.includes('NOT_AUTHENTICATED') || error.code === '42501') {
    return { status: 403, message: 'Non autorisé' }
  }
  if (msg.includes('NOT_FOUND') || error.code === 'P0002') {
    return { status: 404, message: 'Réservation non trouvée' }
  }
  if (msg.includes('INVALID_DATES') || msg.includes('PAST_DATE') || msg.includes('INVALID_STATUS') || msg.includes('INVALID_ACTION')) {
    return { status: 400, message: 'Données invalides' }
  }
  return { status: 500, message: 'Une erreur est survenue' }
}
