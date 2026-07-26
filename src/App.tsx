import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import SelectClient from '@/pages/SelectClient'
import Dashboard from '@/pages/Dashboard'
import Documentos from '@/pages/Documentos'
import Empresa from '@/pages/Empresa'
import Establecimientos from '@/pages/Establecimientos'
import ApiKeys from '@/pages/ApiKeys'
import Certificado from '@/pages/Certificado'
import Ambientes from '@/pages/Ambientes'
import Equipo from '@/pages/Equipo'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/seleccionar-negocio" element={<SelectClient />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documentos"
        element={
          <ProtectedRoute>
            <Documentos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresa"
        element={
          <ProtectedRoute>
            <Empresa />
          </ProtectedRoute>
        }
      />
      <Route
        path="/establecimientos"
        element={
          <ProtectedRoute>
            <Establecimientos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-keys"
        element={
          <ProtectedRoute>
            <ApiKeys />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificado"
        element={
          <ProtectedRoute>
            <Certificado />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ambientes"
        element={
          <ProtectedRoute>
            <Ambientes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipo"
        element={
          <ProtectedRoute>
            <Equipo />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
