import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Payments from './pages/Payments'
import Analytics from './pages/Analytics'
import Inventory from './pages/Inventory'
import Categories from './pages/Categories'
import EditTags from './pages/EditTags'
import Journal from './pages/Journal'
import Banners from './pages/Banners'
import InSitu from './pages/InSitu'
import HouseContent from './pages/HouseContent'
import Enquiry from './pages/Enquiry'
import Settings from './pages/Settings'

function Protected({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="spinner" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, ready } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={ready && user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/edit-tags" element={<EditTags />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/banners" element={<Banners />} />
        <Route path="/in-situ" element={<InSitu />} />
        <Route path="/house" element={<HouseContent />} />
        <Route path="/enquiry" element={<Enquiry />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
