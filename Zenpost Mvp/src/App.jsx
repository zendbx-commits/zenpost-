import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Websites from './pages/Websites'
import AddWebsite from './pages/AddWebsite'
import WebsiteDetails from './pages/WebsiteDetails'
import WebsiteAnalysis from './pages/WebsiteAnalysis'
import MarketingIntelligence from './pages/MarketingIntelligence'
import ContentCalendar from './pages/ContentCalendar'
import SocialAccounts from './pages/SocialAccounts'
import SettingsProfile from './pages/settings/SettingsProfile'
import SettingsWorkspace from './pages/settings/SettingsWorkspace'
import SettingsPreferences from './pages/settings/SettingsPreferences'
import SettingsSecurity from './pages/settings/SettingsSecurity'
import SettingsAccount from './pages/settings/SettingsAccount'
import Approvals from './pages/Approvals'
import Analytics from './pages/Analytics'
import Autopilot from './pages/Autopilot'
import Campaigns from './pages/Campaigns'
import SchedulePosts from './pages/SchedulePosts'
import CreatePost from './pages/CreatePost'
import './App.css'

function AppContent() {
  const location = useLocation()
  
  // Hide navbar and footer on auth pages
  const isAuthPage = ['/signup', '/login', '/forgot-password', '/reset-password'].includes(location.pathname)
  
  // Hide footer on dashboard, website, brand, social, settings, ai, and campaigns pages
  const isDashboard = location.pathname.startsWith('/dashboard') || 
                     location.pathname.startsWith('/websites') ||
                     location.pathname.startsWith('/brand') ||
                     location.pathname.startsWith('/social') ||
                     location.pathname.startsWith('/settings') ||
                     location.pathname.startsWith('/ai') ||
                     location.pathname.startsWith('/campaigns')

  return (
    <div className="app">
      {!isAuthPage && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/websites" element={<Websites />} />
          <Route path="/websites/add" element={<AddWebsite />} />
          <Route path="/websites/:id" element={<WebsiteDetails />} />
          <Route path="/websites/:id/analysis" element={<WebsiteAnalysis />} />
          <Route path="/marketing-intelligence" element={<MarketingIntelligence />} />
          <Route path="/content-calendar" element={<ContentCalendar />} />
          <Route path="/social/accounts" element={<SocialAccounts />} />
          <Route path="/settings/profile" element={<SettingsProfile />} />
          <Route path="/settings/workspace" element={<SettingsWorkspace />} />
          <Route path="/settings/preferences" element={<SettingsPreferences />} />
          <Route path="/settings/security" element={<SettingsSecurity />} />
          <Route path="/settings/account" element={<SettingsAccount />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/autopilot" element={<Autopilot />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/schedule-posts" element={<SchedulePosts />} />
          <Route path="/create-post" element={<CreatePost />} />
        </Routes>

      </main>
      {!isAuthPage && !isDashboard && <Footer />}
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
