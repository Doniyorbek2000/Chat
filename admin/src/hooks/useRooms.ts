import useSWR from 'swr'
import { api } from '@/lib/api'
import { Room, PaginatedResponse, QueryParams, RoomMember, GiftTransaction } from '@/types'

export function useRooms(params: QueryParams = {}) {
  const key = JSON.stringify({ type: 'rooms', ...params })

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Room>>(
    key,
    () => api.getRooms(params),
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30s for live data
      dedupingInterval: 10000,
    }
  )

  return {
    rooms: data?.data || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useLiveRooms() {
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Room>>(
    'live-rooms',
    () => api.getRooms({ status: 'live', limit: 50 }),
    {
      revalidateOnFocus: true,
      refreshInterval: 15000, // Refresh every 15s
    }
  )

  return {
    rooms: data?.data || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useRoom(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Room>(
    id ? `room-${id}` : null,
    () => api.getRoom(id!),
    {
      revalidateOnFocus: false,
      refreshInterval: 30000,
    }
  )

  return {
    room: data,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useRoomMembers(roomId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RoomMember[]>(
    roomId ? `room-members-${roomId}` : null,
    () => api.getRoomMembers(roomId!),
    {
      revalidateOnFocus: false,
      refreshInterval: 30000,
    }
  )

  return {
    members: data || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useRoomGiftHistory(roomId: string | null, params: QueryParams = {}) {
  const key = roomId ? JSON.stringify({ type: 'room-gifts', roomId, ...params }) : null

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<GiftTransaction>>(
    key,
    () => api.getRoomGiftHistory(roomId!, params),
    { revalidateOnFocus: false }
  )

  return {
    gifts: data?.data || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}
