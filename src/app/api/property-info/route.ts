import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase'
import { UserRole } from '@/types'
import { getAnonKey, getSupabaseServerUrl } from '@/lib/runtime-env'

export async function GET(request: Request) {
  try {
    if (!getSupabaseServerUrl() || !getAnonKey()) {
      return NextResponse.json(
        { error: 'Configuration Supabase manquante' },
        { status: 500 }
      )
    }

    const session = await getServerSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient(request)

    let { data: propertyInfo, error } = await supabase
      .from('property_info')
      .select('*')
      .eq('id', 'singleton')
      .single()

    if (error && error.code === 'PGRST116') {
      // Seuls les admins créent le singleton ; membres voient 404 soft
      if (session.role === UserRole.ADMIN) {
        const serviceSupabase = createServiceRoleClient()
        const { data: newPropertyInfo, error: createError } = await serviceSupabase
          .from('property_info')
          .insert({ id: 'singleton' })
          .select()
          .single()

        if (createError) {
          throw createError
        }
        propertyInfo = newPropertyInfo
      } else {
        return NextResponse.json(
          { error: 'Infos pratiques non configurées' },
          { status: 404 }
        )
      }
    } else if (error) {
      throw error
    }

    return NextResponse.json({
      openingTime: propertyInfo?.opening_time || null,
      closingTime: propertyInfo?.closing_time || null,
      practicalInfo: propertyInfo?.practical_info || null,
      openingChecklist: propertyInfo?.opening_checklist || null,
      closingChecklist: propertyInfo?.closing_checklist || null,
      generalInfo: propertyInfo?.general_info || null,
      address: propertyInfo?.address || null,
      wifiNetwork: propertyInfo?.wifi_network || null,
      wifiPassword: propertyInfo?.wifi_password || null,
      contacts: propertyInfo?.contacts || [],
      trashSchedule: propertyInfo?.trash_schedule || [],
      apartmentRules: propertyInfo?.apartment_rules || [],
      customInfoItems: propertyInfo?.custom_info_items || [],
      updatedAt: propertyInfo?.updated_at,
    })
  } catch (error: any) {
    console.error('Erreur property-info GET:', error?.message || error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Accès refusé. Seuls les administrateurs peuvent modifier les infos pratiques.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      openingTime,
      closingTime,
      practicalInfo,
      openingChecklist,
      closingChecklist,
      generalInfo,
      address,
      wifiNetwork,
      wifiPassword,
      contacts,
      trashSchedule,
      apartmentRules,
      customInfoItems,
    } = body

    // Admin authenticated — intentional service role for upsert singleton
    const clientSupabase = createServiceRoleClient()

    const dataToUpsert = {
      id: 'singleton',
      opening_time: openingTime || null,
      closing_time: closingTime || null,
      practical_info: practicalInfo || null,
      opening_checklist: openingChecklist || null,
      closing_checklist: closingChecklist || null,
      general_info: generalInfo || null,
      address: address || null,
      wifi_network: wifiNetwork || null,
      wifi_password: wifiPassword || null,
      contacts: contacts || [],
      trash_schedule: trashSchedule || [],
      apartment_rules: apartmentRules || [],
      custom_info_items: customInfoItems || [],
    }

    const { data: propertyInfo, error } = await clientSupabase
      .from('property_info')
      .upsert(dataToUpsert, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      openingTime: propertyInfo?.opening_time || null,
      closingTime: propertyInfo?.closing_time || null,
      practicalInfo: propertyInfo?.practical_info || null,
      openingChecklist: propertyInfo?.opening_checklist || null,
      closingChecklist: propertyInfo?.closing_checklist || null,
      generalInfo: propertyInfo?.general_info || null,
      address: propertyInfo?.address || null,
      wifiNetwork: propertyInfo?.wifi_network || null,
      wifiPassword: propertyInfo?.wifi_password || null,
      contacts: propertyInfo?.contacts || [],
      trashSchedule: propertyInfo?.trash_schedule || [],
      apartmentRules: propertyInfo?.apartment_rules || [],
      customInfoItems: propertyInfo?.custom_info_items || [],
      updatedAt: propertyInfo?.updated_at,
    })
  } catch (error: any) {
    console.error('Erreur property-info PUT:', error?.message || error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la mise à jour' },
      { status: 500 }
    )
  }
}
