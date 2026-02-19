import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import PriceDocumentList from './pages/PriceDocuments';
import PriceDocumentEditor from './pages/PriceDocuments/PriceDocumentEditor';
import Layout from './components/Layout';
import { ThemeProvider } from './context/ThemeContext';
import Settings from './pages/Settings';
import PriceTypes from './pages/PriceTypes';
import Counterparties from './pages/Counterparties';
import OrganizationSettings from './pages/OrganizationSettings';
import Orders from './pages/Orders';
import RealizationList from './pages/Realizations';
import RealizationDetails from './pages/Realizations/RealizationDetails';
import OrderDetails from './pages/Orders/OrderDetails';
import OrderEdit from './pages/Orders/OrderEdit';
import OrderCreate from './pages/Orders/OrderCreate';
import OrdersArchive from './pages/Orders/OrdersArchive';
import GoodsReceiptList from './pages/GoodsReceipt';
import GoodsReceiptEdit from './pages/GoodsReceipt/Edit';
import './i18n';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products" 
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products/new" 
          element={
            <ProtectedRoute>
              <ProductForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products/:id" 
          element={
            <ProtectedRoute>
              <ProductForm />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="/price-documents" 
          element={
            <ProtectedRoute>
              <Layout>
                <PriceDocumentList />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/price-documents/:id" 
          element={
            <ProtectedRoute>
              <Layout>
                <PriceDocumentEditor />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/price-types" 
          element={
            <ProtectedRoute>
              <Layout>
                <PriceTypes />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/organization-settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <OrganizationSettings />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/counterparties" 
          element={
            <ProtectedRoute>
              <Layout>
                <Counterparties />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders/archive" 
          element={
            <ProtectedRoute>
              <Layout>
                <OrdersArchive />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute>
              <Layout>
                <Orders />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders/create" 
          element={
            <ProtectedRoute>
              <Layout>
                <OrderCreate />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders/:id" 
          element={
            <ProtectedRoute>
              <Layout>
                <OrderDetails />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders/:id/edit" 
          element={
            <ProtectedRoute>
              <Layout>
                <OrderEdit />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/realizations" 
          element={
            <ProtectedRoute>
              <Layout>
                <RealizationList />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/realizations/:id" 
          element={
            <ProtectedRoute>
              <Layout>
                <RealizationDetails />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/goods-receipt" 
          element={
            <ProtectedRoute>
              <Layout>
                <GoodsReceiptList />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/goods-receipt/:id" 
          element={
            <ProtectedRoute>
              <Layout>
                <GoodsReceiptEdit />
              </Layout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
