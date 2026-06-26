'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { useForgotPassword } from '@/hooks/useAuthMutations'
import { ForgotPasswordSchema } from '@lms/types'
import { cn } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const forgotPassword = useForgotPassword()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = ForgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid email')
      return
    }

    setError('')
    await forgotPassword.mutateAsync(email)
    setSent(true)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-8">
      {sent ? (
        <div className="text-center">
          <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            If <strong>{email}</strong> is registered, a reset link has been
            sent. Check your inbox and spam folder.
          </p>
          <Link
            href="/login"
            className="text-sm text-primary font-medium hover:underline"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft size={14} />
            Back to login
          </Link>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Forgot password?
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your work email and we&apos;ll send a reset link.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Work email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@futureeducation.in"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors',
                  error
                    ? 'border-red-300 bg-red-50'
                    : 'border-surface-200 focus:border-primary'
                )}
              />
              {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={forgotPassword.isPending}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-800 transition-colors disabled:opacity-50"
            >
              {forgotPassword.isPending ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}