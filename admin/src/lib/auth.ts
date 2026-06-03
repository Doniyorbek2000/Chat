import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        try {
          const response = await axios.post(`${API_URL}/api/admin/auth/login`, {
            email: credentials.email,
            password: credentials.password,
          })

          const { user, token } = response.data

          if (user && token) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              avatar: user.avatar,
              accessToken: token,
            }
          }

          return null
        } catch (error: unknown) {
          const axiosError = error as { response?: { data?: { message?: string } } }
          const message = axiosError.response?.data?.message || 'Invalid credentials'
          throw new Error(message)
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.avatar = (user as { avatar?: string }).avatar
        token.accessToken = (user as { accessToken?: string }).accessToken
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).avatar = token.avatar as string;
        (session as any).accessToken = token.accessToken as string;
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || 'voxo-admin-secret-key-change-in-production',
}

export default NextAuth(authOptions)
