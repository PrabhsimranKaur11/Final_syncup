import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Lock, Bell, Shield, Palette, Globe, Zap,
  Camera, Check, X, Eye, EyeOff, ArrowLeft
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, currentUser, updateUser, uploadAvatar, settings, updateSettings } = useTheme();

  const [activeTab, setActiveTab] = useState('profile');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState(currentUser.firstName || 'John');
  const [lastName, setLastName] = useState(currentUser.lastName || 'Doe');
  const [displayName, setDisplayName] = useState(currentUser.displayName || 'John Doe');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [phone, setPhone] = useState(currentUser.phone || '');

  // Account fields
  const [email, setEmail] = useState(currentUser.email || 'john@company.com');

  // Notification toggles (persisted)
  const [notifState, setNotifState] = useState({
    desktopNotifications: settings.desktopNotifications ?? true,
    emailNotifications: settings.emailNotifications ?? true,
    sound: settings.sound ?? true,
    messagePreviews: settings.messagePreviews ?? true,
    mentions: settings.mentions ?? true,
    directMessages: settings.directMessages ?? true,
  });

  // Preferences
  const [language, setLanguage] = useState(settings.language || 'English (US)');
  const [timezone, setTimezone] = useState(settings.timezone || 'Pacific Time (PT)');

  const showToast = () => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  const fileInputRef = React.useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadAvatar(currentUser._id, file);
        showToast();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateUser(currentUser._id, { firstName, lastName, displayName, bio, phone });
      showToast();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEmail = async () => {
    try {
      await updateUser(currentUser._id, { email });
      showToast();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleNotif = (key) => {
    const newState = { ...notifState, [key]: !notifState[key] };
    setNotifState(newState);
    updateSettings(newState);
  };

  const handleSavePreferences = () => {
    updateSettings({ language, timezone });
    showToast();
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'preferences', label: 'Preferences', icon: Globe }
  ];

  return (
    <div className="min-h-screen">
      <div className="min-h-screen bg-slate-100 dark:bg-[#222831] transition-colors duration-500">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

        <div className="relative">
          {/* Header */}
          <div className="border-b border-slate-200/50 dark:border-[#76ABAE]/20 bg-white/80 dark:bg-[#31363F]/80 backdrop-blur-lg transition-colors duration-500">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-10 h-10 hover:bg-slate-100 dark:hover:bg-[#222831]/60 rounded-xl flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-[#EEEEEE]/50" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-[#EEEEEE]">Settings</h1>
                    <p className="text-sm text-slate-600 dark:text-[#EEEEEE]/50">Manage your account and preferences</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 dark:bg-[#76ABAE] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 dark:shadow-[#76ABAE]/20">
                    <Zap className="w-6 h-6 text-white dark:text-[#222831]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Toast */}
          {showSaveToast && (
            <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg shadow-green-500/30 font-semibold flex items-center gap-2 animate-in slide-up">
              <Check className="w-5 h-5" />
              Changes saved successfully!
            </div>
          )}

          {/* Main Content */}
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1">
                <div className="bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-2 sticky top-6 transition-colors duration-500">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          activeTab === tab.id
                            ? 'bg-blue-600 dark:bg-[#76ABAE] text-white dark:text-[#222831] shadow-lg shadow-blue-500/30 dark:shadow-[#76ABAE]/20'
                            : 'text-slate-600 dark:text-[#EEEEEE]/70 hover:bg-slate-100 dark:hover:bg-[#222831]/60'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Area */}
              <div className="lg:col-span-3 space-y-6">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Profile Picture */}
                    <div className="bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 transition-colors duration-500">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-6">Profile Picture</h3>
                      <div className="flex items-center gap-6">
                        <div className="relative group">
                          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                            {`${firstName[0] || 'J'}${lastName[0] || 'D'}`}
                          </div>
                          <button className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-6 h-6 text-white" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleAvatarUpload} 
                          />
                          <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-blue-600 dark:bg-[#76ABAE] text-white dark:text-[#222831] rounded-xl hover:shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-[#76ABAE]/20 transition-all font-medium">
                            Upload Photo
                          </button>
                          <button className="ml-3 px-5 py-2.5 bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 rounded-xl hover:bg-slate-200 dark:hover:bg-[#222831] transition-all font-medium">
                            Remove
                          </button>
                          <p className="text-sm text-slate-500 dark:text-[#EEEEEE]/40 mt-3">JPG, PNG or GIF. Max size 5MB.</p>
                        </div>
                      </div>
                    </div>

                    {/* Personal Information */}
                    <div className="bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 transition-colors duration-500">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-6">Personal Information</h3>
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">First Name</label>
                            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">Last Name</label>
                            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">Display Name</label>
                          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">Bio</label>
                          <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..."
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] placeholder-slate-400 dark:placeholder-[#EEEEEE]/40 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all resize-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">Phone Number</label>
                          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] placeholder-slate-400 dark:placeholder-[#EEEEEE]/40 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all" />
                        </div>
                      </div>
                      <div className="mt-6 flex gap-3">
                        <button onClick={handleSaveProfile} className="px-6 py-3 bg-blue-600 dark:bg-[#76ABAE] text-white dark:text-[#222831] rounded-xl hover:shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-[#76ABAE]/20 transition-all font-semibold">
                          Save Changes
                        </button>
                        <button onClick={() => { setFirstName(currentUser.firstName); setLastName(currentUser.lastName); setDisplayName(currentUser.displayName); setBio(currentUser.bio); setPhone(currentUser.phone); }}
                          className="px-6 py-3 bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 rounded-xl hover:bg-slate-200 dark:hover:bg-[#222831] transition-all font-semibold">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Tab */}
                {activeTab === 'account' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 transition-colors duration-500">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-6">Email Address</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">Current Email</label>
                          <div className="flex gap-3">
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all" />
                            <button onClick={handleSaveEmail} className="px-5 py-3 bg-blue-600 dark:bg-[#76ABAE] text-white dark:text-[#222831] rounded-xl hover:shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-[#76ABAE]/20 transition-all font-medium">
                              Update
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-[#EEEEEE]/50">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Email verified</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-6">
                      <h3 className="text-lg font-bold text-red-900 dark:text-red-400 mb-2">Danger Zone</h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                      <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-semibold">
                        Delete Account
                      </button>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 transition-colors duration-500">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-6">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">Current Password</label>
                          <div className="relative">
                            <input type={showOldPassword ? 'text' : 'password'}
                              className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all" />
                            <button type="button" onClick={() => setShowOldPassword(!showOldPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#EEEEEE]/70">
                              {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">New Password</label>
                          <div className="relative">
                            <input type={showNewPassword ? 'text' : 'password'}
                              className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all" />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#EEEEEE]/70">
                              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">Confirm New Password</label>
                          <input type="password"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all" />
                        </div>
                      </div>
                      <button onClick={showToast} className="mt-6 px-6 py-3 bg-blue-600 dark:bg-[#76ABAE] text-white dark:text-[#222831] rounded-xl hover:shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-[#76ABAE]/20 transition-all font-semibold">
                        Update Password
                      </button>
                    </div>

                    <div className="bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 transition-colors duration-500">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-4">Two-Factor Authentication</h3>
                      <p className="text-sm text-slate-600 dark:text-[#EEEEEE]/50 mb-6">Add an extra layer of security to your account</p>
                      <button className="px-6 py-3 bg-blue-600 dark:bg-[#76ABAE] text-white dark:text-[#222831] rounded-xl hover:shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-[#76ABAE]/20 transition-all font-semibold">
                        Enable 2FA
                      </button>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 transition-colors duration-500">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-6">Notification Preferences</h3>
                      <div className="space-y-4">
                        {[
                          { key: 'desktopNotifications', label: 'Desktop Notifications', desc: 'Get notified about new messages on desktop' },
                          { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email updates about activity' },
                          { key: 'sound', label: 'Sound', desc: 'Play sound for new messages' },
                          { key: 'messagePreviews', label: 'Message Previews', desc: 'Show message content in notifications' },
                          { key: 'mentions', label: 'Mentions', desc: 'Get notified when someone mentions you' },
                          { key: 'directMessages', label: 'Direct Messages', desc: 'Get notified about direct messages' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#222831]/80 rounded-xl border border-slate-200/50 dark:border-[#76ABAE]/20">
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900 dark:text-[#EEEEEE] mb-1">{item.label}</div>
                              <div className="text-sm text-slate-600 dark:text-[#EEEEEE]/50">{item.desc}</div>
                            </div>
                            <button
                              onClick={() => handleToggleNotif(item.key)}
                              className={`relative w-12 h-6 rounded-full transition-colors ml-4 ${
                                notifState[item.key] ? 'bg-blue-600 dark:bg-[#76ABAE]' : 'bg-slate-300 dark:bg-[#222831]'
                              }`}
                            >
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                notifState[item.key] ? 'translate-x-6' : 'translate-x-0'
                              }`}></div>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 transition-colors duration-500">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-6">Theme</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <button
                          onClick={() => { if (darkMode) toggleDarkMode(); }}
                          className={`p-6 rounded-xl transition-all ${!darkMode ? 'border-2 border-blue-600 dark:border-[#76ABAE] shadow-lg' : 'border-2 border-slate-200 dark:border-[#76ABAE]/20'} bg-white hover:shadow-lg`}
                        >
                          <div className="w-full h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-4"></div>
                          <div className="font-semibold text-slate-900">Light Mode</div>
                        </button>
                        <button
                          onClick={() => { if (!darkMode) toggleDarkMode(); }}
                          className={`p-6 rounded-xl transition-all ${darkMode ? 'border-2 border-blue-600 dark:border-[#76ABAE] shadow-lg' : 'border-2 border-slate-300 dark:border-[#76ABAE]/20'} bg-slate-900 hover:shadow-lg`}
                        >
                          <div className="w-full h-32 bg-gradient-to-br from-[#31363F] to-[#222831] rounded-lg mb-4"></div>
                          <div className="font-semibold text-white">Dark Mode</div>
                        </button>
                      </div>
                      <div className="mt-6 p-4 bg-slate-50 dark:bg-[#222831]/80 rounded-xl border border-slate-200/50 dark:border-[#76ABAE]/20 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-[#EEEEEE] mb-1">Dark Mode</div>
                          <div className="text-sm text-slate-600 dark:text-[#EEEEEE]/50">Toggle dark theme</div>
                        </div>
                        <button
                          onClick={toggleDarkMode}
                          className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-600 dark:bg-[#76ABAE]' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 transition-colors duration-500">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-6">Language & Region</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">Language</label>
                          <select value={language} onChange={(e) => setLanguage(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all">
                            <option>English (US)</option>
                            <option>Spanish</option>
                            <option>French</option>
                            <option>German</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-[#EEEEEE]/70 mb-2">Timezone</label>
                          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 rounded-xl text-slate-900 dark:text-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#76ABAE] transition-all">
                            <option>Pacific Time (PT)</option>
                            <option>Eastern Time (ET)</option>
                            <option>Central Time (CT)</option>
                            <option>Mountain Time (MT)</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-6">
                        <button onClick={handleSavePreferences} className="px-6 py-3 bg-blue-600 dark:bg-[#76ABAE] text-white dark:text-[#222831] rounded-xl hover:shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-[#76ABAE]/20 transition-all font-semibold">
                          Save Preferences
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;