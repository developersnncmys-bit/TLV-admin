import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import Wordmark from './Wordmark'
import { orders as ordersApi } from '../api/client'
import {
  IconDashboard, IconBox, IconTag, IconLayers, IconBook, IconImage,
  IconMapPin, IconBuilding, IconPhone, IconSettings, IconOrders, IconInventory,
  IconUsers, IconCard, IconChart,
} from './icons'

const NAV = [
  { to: '/',           label: 'Dashboard',        Icon: IconDashboard, end: true },
  { to: '/orders',     label: 'Order Management', Icon: IconOrders, badge: 'pending' },
  { to: '/customers',  label: 'Customers',        Icon: IconUsers },
  { to: '/payments',   label: 'Payments',         Icon: IconCard },
  { to: '/analytics',  label: 'Analytics',        Icon: IconChart },
  { to: '/products',   label: 'Pieces',           Icon: IconBox },
  { to: '/inventory',  label: 'Inventory',        Icon: IconInventory },
  { to: '/categories', label: 'Categories',       Icon: IconTag },
  { to: '/edit-tags',  label: 'The Edit',         Icon: IconLayers },
  { to: '/journal',    label: 'Journal',          Icon: IconBook },
  { to: '/banners',    label: 'Banners',          Icon: IconImage },
  { to: '/in-situ',    label: 'In-Situ',          Icon: IconMapPin },
  { to: '/house',      label: 'The House',        Icon: IconBuilding },
  { to: '/enquiry',    label: 'Enquiry',          Icon: IconPhone },
  { to: '/settings',   label: 'Settings',         Icon: IconSettings },
]

export default function Sidebar({ open, onNavigate }) {
  const [pending, setPending] = useState(0)

  useEffect(() => {
    ordersApi.list()
      .then((os) => setPending(os.filter((o) => (o.status || 'pending') === 'pending').length))
      .catch(() => {})
  }, [])

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <Wordmark height={38} />
      </div>

      <nav className="nav">
        <div className="nav-label">Main Menu</div>
        {NAV.map(({ to, label, Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="ico"><Icon size={19} /></span>
            <span className="nav-text">{label}</span>
            {badge === 'pending' && pending > 0 && (
              <span className="nav-badge">{pending}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="online-card">
          <span className="online-dot" />
          <div>
            <div className="online-t">Studio</div>
            <div className="online-s">Local mode</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
