'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogState {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  resolve: (value: boolean) => void
}

interface ConfirmDialogContextValue {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
}

interface ConfirmOptions {
  title?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

const ConfirmDialogContext = React.createContext<ConfirmDialogContextValue | null>(null)

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmDialogState | null>(null)
  const resolvedRef = React.useRef(false)

  const confirm = React.useCallback(
    (message: string, options?: ConfirmOptions): Promise<boolean> => {
      resolvedRef.current = false
      return new Promise((resolve) => {
        setState({
          open: true,
          message,
          title: options?.title,
          confirmText: options?.confirmText ?? '확인',
          cancelText: options?.cancelText ?? '취소',
          variant: options?.variant ?? 'default',
          resolve,
        })
      })
    },
    []
  )

  const handleConfirm = React.useCallback(() => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    state?.resolve(true)
    setState(null)
  }, [state])

  const handleCancel = React.useCallback(() => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    state?.resolve(false)
    setState(null)
  }, [state])

  const value = React.useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <AlertDialog open={!!state} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {state?.title ?? '확인'}
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap">
              {state?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {state?.cancelText ?? '취소'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                state?.variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
            >
              {state?.confirmText ?? '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog(): ConfirmDialogContextValue {
  const context = React.useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider')
  }
  return context
}
