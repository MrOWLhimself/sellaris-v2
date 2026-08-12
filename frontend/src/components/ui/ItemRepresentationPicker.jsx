import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Matches Loyverse's 8-swatch "Representation on POS" pattern, tuned
// to our brand palette instead of theirs.
export const SWATCHES = ['#5B3FA6', '#C0392B', '#D35400', '#B8860B', '#2E8B57', '#1F6F8B', '#3F63A8', '#8E44AD']

export function ItemRepresentationPicker({ type, color, imageUrl, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`

    const { error: uploadErr } = await supabase.storage.from('item-images').upload(path, file)
    if (uploadErr) {
      setError(uploadErr.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('item-images').getPublicUrl(path)
    onChange({ representation_type: 'image', image_url: data.publicUrl, color })
    setUploading(false)
  }

  return (
    <div>
      <div className="text-[13.5px] font-medium mb-2.5">Representation on POS</div>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => onChange({ representation_type: 'color', color, image_url: imageUrl })}
          className={`px-3 py-1.5 rounded-full text-[12.5px] transition-colors ${
            type === 'color' ? 'bg-[var(--violet)] text-[#F5F3FA]' : 'bg-[var(--surface-3)] text-[var(--ink-text-muted)]'
          }`}
        >
          Color
        </button>
        <button
          type="button"
          onClick={() => { onChange({ representation_type: 'image', color, image_url: imageUrl }); fileRef.current?.click() }}
          className={`px-3 py-1.5 rounded-full text-[12.5px] transition-colors ${
            type === 'image' ? 'bg-[var(--violet)] text-[#F5F3FA]' : 'bg-[var(--surface-3)] text-[var(--ink-text-muted)]'
          }`}
        >
          Image
        </button>
      </div>

      {type === 'color' ? (
        <div className="flex gap-2 flex-wrap">
          {SWATCHES.map((sw) => (
            <button
              key={sw}
              type="button"
              onClick={() => onChange({ representation_type: 'color', color: sw, image_url: imageUrl })}
              className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: sw, borderColor: color === sw ? 'var(--ink-text)' : 'transparent' }}
              aria-label={sw}
            />
          ))}
        </div>
      ) : (
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          {imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageUrl} alt="" className="w-16 h-16 rounded-[var(--radius)] object-cover border border-[var(--line)]" />
              <button type="button" onClick={() => fileRef.current?.click()} className="text-[12.5px] text-[var(--violet)] hover:underline">
                {uploading ? 'Uploading\u2026' : 'Change image'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-16 h-16 rounded-[var(--radius)] border-2 border-dashed border-[var(--line-strong)] flex items-center justify-center text-[11px] text-[var(--ink-text-faint)] hover:border-[var(--violet)]"
            >
              {uploading ? '\u2026' : 'Upload'}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-[12px] text-[var(--danger)] mt-2">{error}</p>}
    </div>
  )
}
