'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, User, Save, Trash2, AlertTriangle, Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [removePasswordCurrent, setRemovePasswordCurrent] = useState('')
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [showRemovePasswordDialog, setShowRemovePasswordDialog] = useState(false)
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
  const [isRemovingPassword, setIsRemovingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  // 최신 사용자 정보 가져오기 (세션 정보로 덮어쓰지 않음)
  const fetchUserProfile = useCallback(async (skipStateUpdate = false) => {
    try {
      const response = await fetch('/api/profile/me')
      if (response.ok) {
        const data = await response.json()
        if (!skipStateUpdate) {
          setName(data.user.name || '')
          setAvatar(data.user.avatar || null)
        }
        return data.user
      } else {
        // API 실패 시 세션 정보 사용
        if (session?.user && !skipStateUpdate) {
          setName(session.user.name || '')
          setAvatar(session.user.image || null)
        }
        return null
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // 에러 시 세션 정보 사용
      if (session?.user && !skipStateUpdate) {
        setName(session.user.name || '')
        setAvatar(session.user.image || null)
      }
      return null
    }
  }, [session?.user])

  // 페이지 마운트 시 항상 최신 정보 가져오기
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 컴포넌트 마운트 시 한 번만 실행

  // 사용자 ID가 변경될 때만 최신 정보 가져오기 (세션 업데이트로 인한 재호출 방지)
  const prevUserIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (session?.user?.id && session.user.id !== prevUserIdRef.current) {
      prevUserIdRef.current = session.user.id
      fetchUserProfile()
    }
  }, [session?.user?.id, fetchUserProfile])

  useEffect(() => {
    // 비밀번호 존재 여부 확인
    const checkPassword = async () => {
      try {
        const response = await fetch('/api/profile/check-password')
        if (response.ok) {
          const data = await response.json()
          setHasPassword(data.hasPassword)
        }
      } catch (error) {
        console.error('Error checking password:', error)
      }
    }
    checkPassword()
  }, [])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB를 초과할 수 없습니다.')
      return
    }

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('JPG, PNG 또는 GIF 형식만 지원됩니다.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '프로필 사진 업로드에 실패했습니다.')
        return
      }

      setAvatar(data.avatarUrl)
      setSuccess('프로필 사진이 업로드되었습니다.')
      
      // 사이드바 업데이트를 위해 페이지 새로고침
      router.refresh()
    } catch (error) {
      setError('프로필 사진 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profile/remove-avatar', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '프로필 사진 삭제에 실패했습니다.')
        return
      }

      setAvatar(null)
      setSuccess('프로필 사진이 삭제되었습니다.')
      
      // 사이드바 업데이트를 위해 페이지 새로고침
      router.refresh()
    } catch (error) {
      setError('프로필 사진 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '프로필 업데이트에 실패했습니다.')
        return
      }

      setSuccess('프로필이 업데이트되었습니다.')
      
      // 사이드바 업데이트를 위해 페이지 새로고침
      router.refresh()
    } catch (error) {
      setError('프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '비밀번호 변경에 실패했습니다.')
        return
      }

      setSuccess('비밀번호가 변경되었습니다.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setError('비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePassword = async () => {
    setIsRemovingPassword(true)
    setError('')

    try {
      const response = await fetch('/api/profile/remove-password', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: removePasswordCurrent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '비밀번호 제거에 실패했습니다.')
        return
      }

      setSuccess('비밀번호가 제거되었습니다. 이제 구글 계정으로만 로그인할 수 있습니다.')
      setShowRemovePasswordDialog(false)
      setRemovePasswordCurrent('')
      setHasPassword(false)
    } catch (error) {
      setError('비밀번호 제거 중 오류가 발생했습니다.')
    } finally {
      setIsRemovingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    setError('')

    try {
      const response = await fetch('/api/profile/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: deleteAccountPassword || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '계정 삭제에 실패했습니다.')
        return
      }

      // 로그아웃 및 홈으로 이동
      router.push('/login')
    } catch (error) {
      setError('계정 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">프로필 설정</h1>
        <p className="text-muted-foreground">
          아바타, 이름, 비밀번호를 변경할 수 있습니다.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50 text-green-900">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* 프로필 사진 */}
        <Card>
          <CardHeader>
            <CardTitle>프로필 사진</CardTitle>
            <CardDescription>
              클릭하여 새 프로필 사진을 업로드하세요. 새 프로필 사진은 다음 로그인 시 반영됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                  <AvatarImage src={avatar || undefined} alt={name || ''} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(name, session.user.email)}
                  </AvatarFallback>
                </Avatar>
                {avatar && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveAvatar()
                    }}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  JPG, PNG 또는 GIF 형식. 최대 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 이름 */}
        <Card>
          <CardHeader>
            <CardTitle>이름</CardTitle>
            <CardDescription>표시될 이름을 입력하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardHeader>
            <CardTitle>비밀번호 변경</CardTitle>
            <CardDescription>
              {hasPassword
                ? '비밀번호를 변경하거나 제거할 수 있습니다. 비밀번호를 제거하면 구글 계정으로만 로그인할 수 있습니다.'
                : '구글 계정으로 가입하셨지만 비밀번호를 설정하시면 이메일/비밀번호 방식으로도 로그인할 수 있습니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호"
              />
              <p className="text-xs text-muted-foreground">
                최소 5자 이상, 영문·숫자·특수문자(.!@#) 포함 필수
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 확인"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleChangePassword}
                disabled={isLoading || !newPassword || !confirmPassword || (hasPassword && !currentPassword)}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                비밀번호 {hasPassword ? '변경' : '설정'}
              </Button>
              {hasPassword && (
                <Button
                  variant="destructive"
                  onClick={() => setShowRemovePasswordDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  비밀번호 제거
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 회원 탈퇴 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <User className="h-5 w-5" />
              회원 탈퇴
            </CardTitle>
            <CardDescription>
              계정을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>! 계정 삭제 시 주의사항</AlertTitle>
              <AlertDescription className="mt-2 space-y-1">
                <p>• 모든 개인 정보가 영구적으로 삭제됩니다</p>
                <p>• 삭제된 계정은 복구할 수 없습니다</p>
                <p>• 업로드한 콘텐츠는 시스템에서 별도 관리됩니다</p>
                <p>• 동일한 이메일로 재가입이 가능합니다</p>
              </AlertDescription>
            </Alert>
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="deleteAccountPassword">계정 삭제를 위한 비밀번호 확인</Label>
                <Input
                  id="deleteAccountPassword"
                  type="password"
                  value={deleteAccountPassword}
                  onChange={(e) => setDeleteAccountPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                />
              </div>
            )}
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAccountDialog(true)}
              disabled={hasPassword && !deleteAccountPassword}
            >
              <User className="mr-2 h-4 w-4" />
              계정 삭제
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-2 mt-8">
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          저장
        </Button>
      </div>

      {/* 비밀번호 제거 다이얼로그 */}
      <Dialog open={showRemovePasswordDialog} onOpenChange={setShowRemovePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 제거</DialogTitle>
            <DialogDescription>
              구글 계정으로만 로그인 가능. 비밀번호를 제거하려면 "현재 비밀번호"를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="removePasswordCurrent">현재 비밀번호</Label>
              <Input
                id="removePasswordCurrent"
                type="password"
                value={removePasswordCurrent}
                onChange={(e) => setRemovePasswordCurrent(e.target.value)}
                placeholder="현재 비밀번호"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemovePasswordDialog(false)
                setRemovePasswordCurrent('')
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemovePassword}
              disabled={isRemovingPassword || !removePasswordCurrent}
            >
              {isRemovingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              비밀번호 제거
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 계정 삭제 다이얼로그 */}
      <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">계정 삭제 확인</DialogTitle>
            <DialogDescription>
              정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>경고</AlertTitle>
              <AlertDescription>
                계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteAccountDialog(false)
                setDeleteAccountPassword('')
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <User className="mr-2 h-4 w-4" />
              계정 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

