import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@routes/AppRoutes';
import { AuthProvider } from '@context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
