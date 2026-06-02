import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { api } from '@/lib/api'
import { User, PaginatedResponse, QueryParams, WalletTransaction, Room, UserBan } from '@/types'

const fetcher = {
  getUsers: (params: QueryParams) => api.getUsers(params),
  getUser: (id: string) => api.getUser(id),
  getUserTransactions: (id: string, params?: QueryParams) => api.getUserTransactions(id, params),
  getUserRooms: (id: string, params?: QueryParams) => api.getUserRooms(id, params),
  getUserBans: (id: string) => api.getUserBans(id),
}

export function useUsers(params: QueryParams = {}) {
  const key = JSON.stringify({ type: 'users', ...params })

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<User>>(
    key,
    () => api.getUsers(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  return {
    users: data?.data || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useUser(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<User>(
    id ? `user-${id}` : null,
    () => api.getUser(id!),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    user: data,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useUserTransactions(userId: string | null, params: QueryParams = {}) {
  const key = userId ? JSON.stringify({ type: 'user-transactions', userId, ...params }) : null

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<WalletTransaction>>(
    key,
    () => api.getUserTransactions(userId!, params),
    { revalidateOnFocus: false }
  )

  return {
    transactions: data?.data || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useUserRooms(userId: string | null, params: QueryParams = {}) {
  const key = userId ? JSON.stringify({ type: 'user-rooms', userId, ...params }) : null

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Room>>(
    key,
    () => api.getUserRooms(userId!, params),
    { revalidateOnFocus: false }
  )

  return {
    rooms: data?.data || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useUserBans(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<UserBan[]>(
    userId ? `user-bans-${userId}` : null,
    () => api.getUserBans(userId!),
    { revalidateOnFocus: false }
  )

  return {
    bans: data || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}
