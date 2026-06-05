'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface DiscoverPost {
  id: string
  text: string
  moderationStatus: string
  reportCount: number
  likeCount: number
  commentCount: number
  isHidden: boolean
  createdAt: string
  author: { id: string; displayName: string; uid: string }
  images: Array<{ url: string }>
  _count?: { reports: number; comments: number; likes: number }
}

interface PostReport {
  id: string
  reason: string
  isResolved: boolean
  createdAt: string
  post: { id: string; text: string; author: { displayName: string } }
  reporter: { id: string; displayName: string }
}

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'reports'>('posts')
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [posts, setPosts] = useState<DiscoverPost[]>([])
  const [reports, setReports] = useState<PostReport[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getDiscoverPosts({ status: statusFilter, page: 1, limit: 20 })
      const result = data?.data ?? data
      setPosts(result?.items ?? (Array.isArray(result) ? result : []))
      setTotal(result?.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getDiscoverReports({ resolved: false, page: 1 })
      const result = data?.data ?? data
      setReports(result?.items ?? (Array.isArray(result) ? result : []))
      setTotal(result?.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'posts') loadPosts()
    else loadReports()
  }, [activeTab, loadPosts, loadReports])

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      await api.approveDiscoverPost(id)
      setPosts(p => p.filter(post => post.id !== id))
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      await api.rejectDiscoverPost(id)
      setPosts(p => p.filter(post => post.id !== id))
    } finally {
      setProcessingId(null)
    }
  }

  const handleResolve = async (id: string) => {
    setProcessingId(id)
    try {
      await api.resolveDiscoverReport(id)
      setReports(r => r.filter(rep => rep.id !== id))
    } finally {
      setProcessingId(null)
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
    REJECTED: 'text-red-400 bg-red-400/10 border-red-400/20',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Discover Moderation</h1>
          <p className="text-dark-400 text-sm mt-1">Post va shikoyatlarni boshqarish</p>
        </div>
        <div className="bg-surface-200 rounded-xl border border-white/5 px-4 py-2 text-center">
          <p className="text-dark-400 text-xs">Jami</p>
          <p className="text-white font-bold text-xl">{total}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5">
        {(['posts', 'reports'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab ? 'text-primary-400 border-b-2 border-primary-400' : 'text-dark-400 hover:text-white'
            }`}
          >
            {tab === 'posts' ? 'Postlar' : 'Shikoyatlar'}
            {tab === 'reports' && reports.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{reports.length}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2">
            {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  statusFilter === s ? statusColors[s] : 'text-dark-400 bg-surface-300 border-white/5 hover:text-white'
                }`}
              >
                {s === 'PENDING' ? 'Kutayotgan' : s === 'APPROVED' ? 'Tasdiqlangan' : 'Rad etilgan'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-dark-400">Post topilmadi</div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-surface-200 rounded-xl border border-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 font-bold text-sm">
                      {post.author.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{post.author.displayName}</p>
                      <p className="text-dark-400 text-xs">@{post.author.uid} · {new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${statusColors[post.moderationStatus]}`}>
                    {post.moderationStatus}
                  </span>
                </div>

                <p className="text-white/80 text-sm mt-3 leading-relaxed line-clamp-3">{post.text}</p>

                {post.images?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {post.images.slice(0, 3).map((img, i) => (
                      <div key={i} className="w-20 h-20 rounded-lg bg-surface-300 overflow-hidden">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-4 text-dark-400 text-xs">
                    <span>❤️ {post.likeCount}</span>
                    <span>💬 {post.commentCount}</span>
                    {post.reportCount > 0 && <span className="text-red-400">🚩 {post.reportCount}</span>}
                  </div>
                  {statusFilter === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(post.id)}
                        disabled={processingId === post.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/20 disabled:opacity-50"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Tasdiqlash
                      </button>
                      <button
                        onClick={() => handleReject(post.id)}
                        disabled={processingId === post.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        Rad etish
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-dark-400">Hal qilinmagan shikoyat yo'q</div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="bg-surface-200 rounded-xl border border-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">
                      Post: <span className="text-dark-300 font-normal">"{report.post.text?.slice(0, 80)}"</span>
                    </p>
                    <p className="text-dark-400 text-xs mt-1">Muallif: {report.post.author.displayName}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-red-400 text-xs font-medium">Sabab: {report.reason}</span>
                      <span className="text-dark-400 text-xs">Shikoyatchi: {report.reporter.displayName}</span>
                      <span className="text-dark-400 text-xs">{new Date(report.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolve(report.id)}
                    disabled={processingId === report.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600/10 border border-primary-500/20 text-primary-400 rounded-lg text-sm hover:bg-primary-600/20 disabled:opacity-50 shrink-0"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Hal qilish
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
