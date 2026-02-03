'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EdmPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  htmlCode: string
  cellImages: Record<string, string>
  cellLinks: Record<string, string>
}

export function EdmPreviewDialog({
  open,
  onOpenChange,
  htmlCode,
}: EdmPreviewDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[100] bg-black/80',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-[100] translate-x-[-50%] translate-y-[-50%]',
            'w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh]',
            'flex flex-col p-6 gap-4 overflow-hidden',
            'border bg-background shadow-lg rounded-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
        <div className="flex flex-col space-y-1.5 shrink-0">
          <DialogPrimitive.Title className="text-lg font-semibold">
            HTML 테이블 미리보기
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            테이블로 분리된 이미지와 적용된 링크를 미리 확인할 수 있습니다.
          </DialogPrimitive.Description>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-0 m-0">
          {htmlCode ? (
            <>
              <style>{`
                .edm-preview-container {
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100%;
                  min-height: 100%;
                }
                .edm-preview-container img {
                  max-width: 100% !important;
                  width: auto !important;
                  height: auto !important;
                  object-fit: contain;
                  display: block;
                }
                .edm-preview-container table {
                  margin-top: 0 !important;
                  margin-bottom: 0 !important;
                  padding: 0 !important;
                  border-collapse: collapse;
                }
              `}</style>
              <div
                className="edm-preview-container"
                dangerouslySetInnerHTML={{ __html: htmlCode }}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">생성된 코드가 없습니다.</p>
          )}
        </div>
        <DialogPrimitive.Close
          className={cn(
            'absolute right-4 top-4 rounded-sm opacity-70',
            'ring-offset-background transition-opacity hover:opacity-100',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">닫기</span>
        </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
