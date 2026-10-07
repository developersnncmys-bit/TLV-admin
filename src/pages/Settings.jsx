import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getSettings, updateSettings, resetAllData } from '../lib/store'
import { auth as authApi } from '../api/client'
import { uploadImage } from '../lib/image'
import { initials } from '../lib/format'
import { IconStore, IconUser, IconShield } from '../components/icons'

const NAV = [
  { k: 'store',   label: 'Studio',  Icon: IconStore },
  { k: 'profile', label: 'Profile', Icon: IconUser },
  { k: 'data',    label: 'Data',    Icon: IconShield },
]

export default function Settings() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('store')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  const [store, setStore] = useState({
    name: '', tagline: '', email: '', phone: '', currency: 'INR', address: '',
    hours: '', legalAddress: '', developerCredit: '',
    instagram: '', facebook: '', youtube: '', linkedin: '',
  })

  useEffect(() => {
    const s = getSettings()
    setStore({ ...store, ...(s.store || {}) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function saveStore() {
    updateSettings({ store })
    toast.ok('Studio settings saved')
  }

  function saveProfile(patch) {
    const next = authApi.updateMe(patch)
    Promise.resolve(next).then((u) => setUser(u))
    toast.ok('Profile saved')
  }

  async function onAvatarPicked(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadImage(file)
      const updated = await authApi.updateMe({ avatar: url })
      setUser(updated)
      toast.ok('Profile photo updated')
    } catch (err) {
      toast.bad(err.message || 'Could not update photo')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true)
    try {
      const updated = await authApi.updateMe({ avatar: '' })
      setUser(updated)
      toast.ok('Profile photo removed')
    } catch (err) {
      toast.bad(err.message || 'Could not remove photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  function doReset() {
    if (!window.confirm('This will wipe all local data (pieces, categories, banners, journal, enquiries, settings) and re-seed the admin with defaults. Continue?')) return
    resetAllData()
    toast.ok('Local data reset — reloading…')
    setTimeout(() => window.location.reload(), 400)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Studio details and your profile</p>
        </div>
        <div className="page-actions">
          {tab === 'store' && <button className="btn btn-primary" onClick={saveStore}>Save Changes</button>}
          {tab === 'profile' && (
            <button
              className="btn btn-primary"
              onClick={() => saveProfile({
                name: user?.name,
                role: user?.role,
                email: user?.email,
              })}
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      <div className="settings-wrap">
        <div className="card settings-nav">
          {NAV.map((n) => (
            <button key={n.k} className={`set-nav-item ${tab === n.k ? 'active' : ''}`} onClick={() => setTab(n.k)}>
              <n.Icon size={18} /> {n.label}
            </button>
          ))}
        </div>

        <div className="card card-pad settings-panel">
          {tab === 'store' && (
            <>
              <h3 className="panel-title">Studio Information</h3>
              <div className="form-grid">
                <div className="field">
                  <label>Studio Name</label>
                  <input value={store.name} onChange={(e) => setStore((s) => ({ ...s, name: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Tagline</label>
                  <input value={store.tagline} onChange={(e) => setStore((s) => ({ ...s, tagline: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Client Care Email</label>
                  <input value={store.email} onChange={(e) => setStore((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input value={store.phone} onChange={(e) => setStore((s) => ({ ...s, phone: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Currency</label>
                  <select value={store.currency} onChange={(e) => setStore((s) => ({ ...s, currency: e.target.value }))}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="field full">
                  <label>Studio Address</label>
                  <textarea value={store.address} onChange={(e) => setStore((s) => ({ ...s, address: e.target.value }))} />
                </div>
              </div>

              <h3 className="panel-title" style={{ marginTop: 28 }}>Client Care</h3>
              <div className="form-grid">
                <div className="field full">
                  <label>Opening hours</label>
                  <input
                    value={store.hours}
                    onChange={(e) => setStore((s) => ({ ...s, hours: e.target.value }))}
                    placeholder="Monday – Sunday, 10 a.m. – 8 p.m. IST (except National Holidays)"
                  />
                  <span className="img-hint">Shown in the "Contact an Advisor" column on the storefront Client Care strip.</span>
                </div>
              </div>

              <h3 className="panel-title" style={{ marginTop: 28 }}>Footer</h3>
              <div className="form-grid">
                <div className="field full">
                  <label>Legal address line</label>
                  <textarea
                    value={store.legalAddress}
                    onChange={(e) => setStore((s) => ({ ...s, legalAddress: e.target.value }))}
                    rows={2}
                    placeholder="The Luxe Version Private Limited, 5th Floor, …"
                  />
                  <span className="img-hint">Small print at the bottom-left of the storefront footer.</span>
                </div>
                <div className="field full">
                  <label>Developer credit</label>
                  <input
                    value={store.developerCredit}
                    onChange={(e) => setStore((s) => ({ ...s, developerCredit: e.target.value }))}
                    placeholder="Developed by …"
                  />
                  <span className="img-hint">Bottom-right line of the storefront footer. Leave blank to hide.</span>
                </div>
              </div>

              <h3 className="panel-title" style={{ marginTop: 28 }}>Social Links</h3>
              <p className="img-hint" style={{ marginTop: -8, marginBottom: 16 }}>
                Shown as icons above the footer link columns. Leave blank to hide an icon.
              </p>
              <div className="form-grid">
                <div className="field">
                  <label>Instagram URL</label>
                  <input
                    value={store.instagram}
                    onChange={(e) => setStore((s) => ({ ...s, instagram: e.target.value }))}
                    placeholder="https://instagram.com/…"
                  />
                </div>
                <div className="field">
                  <label>Facebook URL</label>
                  <input
                    value={store.facebook}
                    onChange={(e) => setStore((s) => ({ ...s, facebook: e.target.value }))}
                    placeholder="https://facebook.com/…"
                  />
                </div>
                <div className="field">
                  <label>YouTube URL</label>
                  <input
                    value={store.youtube}
                    onChange={(e) => setStore((s) => ({ ...s, youtube: e.target.value }))}
                    placeholder="https://youtube.com/@…"
                  />
                </div>
                <div className="field">
                  <label>LinkedIn URL</label>
                  <input
                    value={store.linkedin}
                    onChange={(e) => setStore((s) => ({ ...s, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/company/…"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'profile' && (
            <>
              <h3 className="panel-title">Your Profile</h3>
              <div className="profile-photo">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="avatar profile-av" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="avatar profile-av">{initials(user?.name) || 'A'}</div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? 'Uploading…' : user?.avatar ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {user?.avatar && (
                    <button
                      className="btn btn-outline"
                      onClick={removeAvatar}
                      disabled={uploadingAvatar}
                      style={{ color: '#75001F', borderColor: '#75001F' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onAvatarPicked}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Full Name</label>
                  <input defaultValue={user?.name || ''} onBlur={(e) => saveProfile({ name: e.target.value })} />
                </div>
                <div className="field">
                  <label>Role</label>
                  <input defaultValue={user?.role || 'Studio Admin'} onBlur={(e) => saveProfile({ role: e.target.value })} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input defaultValue={user?.email || ''} onBlur={(e) => saveProfile({ email: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {tab === 'data' && (
            <>
              <h3 className="panel-title">Local Data</h3>
              <p style={{ color: '#616373', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                All data in this admin lives in your browser's local storage. Clearing the browser's site data,
                or using a different browser / device, will reset the admin to its seeded defaults.
              </p>
              <p style={{ color: '#616373', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                Use the reset button below if you want to start fresh.
              </p>
              <button className="btn btn-outline" style={{ color: '#75001F', borderColor: '#75001F' }} onClick={doReset}>
                Reset all local data
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
