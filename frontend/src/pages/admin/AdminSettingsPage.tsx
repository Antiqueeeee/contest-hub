import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SettingItem { key: string; value: number; default: number; label: string }

export default function AdminSettingsPage() {
  const [items, setItems] = useState<SettingItem[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get<{ items: SettingItem[] }>('/admin/settings').then(r => {
      setItems(r.items || [])
      const v: Record<string, string> = {}
      ;(r.items || []).forEach(i => { v[i.key] = String(i.value) })
      setValues(v)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setMsg('')
    const nums: Record<string, number> = {}
    for (const i of items) {
      const n = Number(values[i.key])
      if (!Number.isInteger(n) || n < 1 || n > 3650) { setMsg(`「${i.label}」需为 1-3650 之间的整数`); return }
      nums[i.key] = n
    }
    setSaving(true)
    try {
      await api.put('/admin/settings', { values: nums })
      setMsg('保存成功')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存失败')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">系统设置</h1>
      <Card className="max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">数据保留策略</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
          ) : items.map(i => (
            <div key={i.key} className="space-y-1.5">
              <Label>{i.label}</Label>
              <Input type="number" min={1} max={3650} value={values[i.key] ?? ''} onChange={e => { setValues(p => ({ ...p, [i.key]: e.target.value })); setMsg('') }} />
              <p className="text-xs text-muted-foreground">单位：天，范围 1-3650，默认值 {i.default}</p>
            </div>
          ))}
          {msg && <p className={`text-sm ${msg.includes('成功') ? 'text-green-600' : 'text-destructive'}`}>{msg}</p>}
          <Button onClick={handleSave} disabled={saving || loading} className="w-full">{saving ? '保存中...' : '保存设置'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
