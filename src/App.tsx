import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { useState } from 'react';

// Placeholder components
const Login = () => <div className="p-4">Login Page</div>;
const Dashboard = () => <div className="p-4">Dashboard</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
