"use client";

import { useState, useEffect, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Avatar } from "primereact/avatar";
import { Password } from "primereact/password";
import { authApi } from "../../../src/api/auth.api";
import axios from "axios";

type SettingsSection = "profile" | "account" | "appearance" | "audio-video" | "accessibility" | "notifications";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  
  // User Profile State
  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string; avatar?: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password State
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accentColor, setAccentColor] = useState("#4F46E5");
  
  // Accessibility State
  const [textSize, setTextSize] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  
  // Audio/Video State
  const [devices, setDevices] = useState<{ audioIn: any[]; videoIn: any[] }>({ audioIn: [], videoIn: [] });
  const [selectedDevices, setSelectedDevices] = useState({ mic: "", camera: "" });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser({ 
          firstName: parsed.firstName || "", 
          lastName: parsed.lastName || "", 
          email: parsed.email || "",
          avatar: parsed.avatar || ""
        });
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }

    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme-mode");
      const isDark = storedTheme === "dark" || document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);

      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then((devs) => {
          setDevices({
            audioIn: devs.filter(d => d.kind === "audioinput").map(d => ({ label: d.label || `Mic ${d.deviceId.slice(0,5)}`, value: d.deviceId })),
            videoIn: devs.filter(d => d.kind === "videoinput").map(d => ({ label: d.label || `Camera ${d.deviceId.slice(0,5)}`, value: d.deviceId }))
          });
        }).catch(err => console.warn("Media devices access denied", err));
      }
      
      const storedMic = localStorage.getItem("preferred-mic");
      const storedCam = localStorage.getItem("preferred-camera");
      if (storedMic || storedCam) {
        setSelectedDevices({ mic: storedMic || "", camera: storedCam || "" });
      }

      const storedColor = localStorage.getItem("accent-color");
      if (storedColor) {
        setAccentColor(storedColor);
        applyAccentColor(storedColor);
      }

      // Load Accessibility Settings
      const storedTextSize = localStorage.getItem("text-size");
      if (storedTextSize) {
        const size = parseFloat(storedTextSize);
        setTextSize(size);
        applyTextSize(size);
      }

      const storedReducedMotion = localStorage.getItem("reduced-motion");
      if (storedReducedMotion === "true") {
        setReducedMotion(true);
        applyReducedMotion(true);
      }

      const storedHighContrast = localStorage.getItem("high-contrast");
      if (storedHighContrast === "true") {
        setHighContrast(true);
        applyHighContrast(true);
      }
    }
  }, []);

  const applyAccentColor = (color: string) => {
    const root = document.documentElement;
    
    // Main accent color
    root.style.setProperty("--accent", color);
    root.style.setProperty("--ring", color);
    root.style.setProperty("--sidebar-ring", color);
    root.style.setProperty("--ck-blue", color);
    
    // Chart colors (set chart-1 to main color)
    root.style.setProperty("--chart-1", color);
    
    // Generate variants
    const darker = adjustBrightness(color, -15);
    const lighter = adjustBrightness(color, 40);
    const veryLight = adjustBrightness(color, 85);
    
    // Apply variants
    root.style.setProperty("--accent-hover", darker);
    root.style.setProperty("--accent-light", veryLight);
    root.style.setProperty("--accent-lighter", lighter);
    
    // Update PrimeReact component colors
    updatePrimeReactTheme(color, darker);
  };

  const adjustBrightness = (color: string, percent: number): string => {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const adjust = (value: number) => {
      return Math.min(255, Math.max(0, Math.round(value + (255 - value) * (percent / 100))));
    };
    
    const newR = adjust(r).toString(16).padStart(2, "0");
    const newG = adjust(g).toString(16).padStart(2, "0");
    const newB = adjust(b).toString(16).padStart(2, "0");
    
    return `#${newR}${newG}${newB}`;
  };

  const updatePrimeReactTheme = (color: string, hoverColor: string) => {
    // Update PrimeReact components
    const style = document.createElement("style");
    style.id = "accent-theme";
    
    // Remove old style if exists
    const oldStyle = document.getElementById("accent-theme");
    if (oldStyle) oldStyle.remove();
    
    style.innerHTML = `
      /* Primary buttons */
      .p-button-primary {
        background-color: ${color} !important;
        border-color: ${color} !important;
        color: white !important;
      }
      
      .p-button-primary:hover {
        background-color: ${hoverColor} !important;
        border-color: ${hoverColor} !important;
      }
      
      /* Input focus */
      .p-inputtext:focus,
      .p-dropdown:focus,
      input:focus {
        border-color: ${color} !important;
        box-shadow: 0 0 0 0.2rem rgba(${hexToRgb(color)}, 0.25) !important;
      }
      
      /* Dropdown option hover */
      .p-dropdown-panel .p-dropdown-item:hover {
        background-color: rgba(${hexToRgb(color)}, 0.1) !important;
      }
      
      /* Badge */
      .p-badge {
        background-color: ${color} !important;
      }
      
      /* Link colors */
      a, [role="link"] {
        color: ${color};
      }
      
      a:hover, [role="link"]:hover {
        color: ${hoverColor};
      }
    `;
    
    document.head.appendChild(style);
  };

  const hexToRgb = (hex: string): string => {
    const hex2 = hex.replace("#", "");
    const r = parseInt(hex2.substring(0, 2), 16);
    const g = parseInt(hex2.substring(2, 4), 16);
    const b = parseInt(hex2.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  };

  const applyTextSize = (size: number) => {
    const root = document.documentElement;
    root.style.fontSize = (16 * size) + "px";
  };

  const applyReducedMotion = (enabled: boolean) => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add("reduced-motion");
    } else {
      root.classList.remove("reduced-motion");
    }
  };

  const applyHighContrast = (enabled: boolean) => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  };

  const updateAccentColor = (color: string) => {
    setAccentColor(color);
    applyAccentColor(color);
    localStorage.setItem("accent-color", color);
    window.dispatchEvent(new Event("accent-color-updated"));
  };

  const handleProfileUpdate = async (e?: React.FormEvent, updatedAvatar?: string) => {
    if (e) e.preventDefault();
    if (!user) return;
    
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");
    
    try {
      const payload = { 
        firstName: user.firstName, 
        lastName: user.lastName,
        avatar: updatedAvatar !== undefined ? updatedAvatar : user.avatar
      };
      
      const res = await authApi.updateProfile(payload);
      setProfileSuccess(res.message);
      
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      const newUser = { ...stored, ...payload };
      localStorage.setItem("user", JSON.stringify(newUser));
      
      window.dispatchEvent(new Event("user-profile-updated"));
      
      if (updatedAvatar !== undefined) {
        setUser(prev => prev ? { ...prev, avatar: updatedAvatar } : null);
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleProfileUpdate(undefined, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      const res = await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword, passwordForm.confirmPassword);
      setPasswordSuccess(res.message);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await authApi.deleteAccount();
      localStorage.clear();
      window.location.href = "/";
    } catch (err: any) {
      console.error("Delete account error:", err);
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleTwoFactor = () => {
    setShow2FA(!show2FA);
  };

  const updateTextSize = (newSize: number) => {
    setTextSize(newSize);
    applyTextSize(newSize);
    localStorage.setItem("text-size", newSize.toString());
    window.dispatchEvent(new Event("accessibility-updated"));
  };

  const toggleReducedMotion = () => {
    const newState = !reducedMotion;
    setReducedMotion(newState);
    applyReducedMotion(newState);
    localStorage.setItem("reduced-motion", newState.toString());
    window.dispatchEvent(new Event("accessibility-updated"));
  };

  const toggleHighContrast = () => {
    const newState = !highContrast;
    setHighContrast(newState);
    applyHighContrast(newState);
    localStorage.setItem("high-contrast", newState.toString());
    window.dispatchEvent(new Event("accessibility-updated"));
  };

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme-mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme-mode", "light");
    }
    window.dispatchEvent(new Event("appearance-updated"));
  };

  const menuItems = [
    { id: "profile", label: "Profile", icon: "pi pi-user" },
    { id: "account", label: "Account & Security", icon: "pi pi-lock" },
    { id: "appearance", label: "Appearance", icon: "pi pi-palette" },
    { id: "audio-video", label: "Audio & Video", icon: "pi pi-video" },
    { id: "accessibility", label: "Accessibility", icon: "pi pi-eye" },
    { id: "notifications", label: "Notifications", icon: "pi pi-bell" },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in bg-[var(--bg-canvas)]">
      <div className="px-8 py-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Nav */}
        <div className="w-72 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col p-4 gap-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as SettingsSection)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-[14px] font-medium ${
                activeSection === item.id 
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)]" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)]"
              }`}
            >
              <i className={`${item.icon} text-[16px]`} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Right Content Pane */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-canvas)] p-8">
          <div className="max-w-3xl mx-auto animate-slide-up">
            
            {activeSection === "profile" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Public Profile</h2>
                  <div className="flex items-start gap-8">
                    <div className="flex flex-col items-center gap-4">
                      <div 
                        className="relative group cursor-pointer" 
                        onClick={handleAvatarClick}
                      >
                        <Avatar 
                          image={user?.avatar} 
                          label={!user?.avatar ? `${user?.firstName?.[0]}${user?.lastName?.[0]}` : undefined} 
                          shape="circle" 
                          size="xlarge" 
                          className="w-32 h-32 text-2xl border-4 border-[var(--bg-surface)] shadow-md"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <i className="pi pi-camera text-white text-2xl" />
                        </div>
                        {profileLoading && (
                          <div className="absolute inset-0 bg-[var(--bg-surface)]/60 rounded-full flex items-center justify-center">
                            <i className="pi pi-spin pi-spinner text-[var(--accent)] text-2xl" />
                          </div>
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                      <p className="text-[12px] text-[var(--text-muted)] text-center">Click to change avatar</p>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="flex-1 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[13px] font-semibold text-[var(--text-secondary)]">First Name</label>
                          <InputText 
                            value={user?.firstName || ""} 
                            onChange={(e) => setUser(u => u ? {...u, firstName: e.target.value} : null)} 
                            className="w-full bg-[var(--bg-surface)] border-[var(--border-subtle)]"
                            placeholder="e.g. John"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Last Name</label>
                          <InputText 
                            value={user?.lastName || ""} 
                            onChange={(e) => setUser(u => u ? {...u, lastName: e.target.value} : null)} 
                            className="w-full bg-[var(--bg-surface)] border-[var(--border-subtle)]"
                            placeholder="e.g. Doe"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Bio</label>
                        <textarea 
                          rows={4}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md p-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all resize-none"
                          placeholder="Tell us a little about yourself..."
                        />
                      </div>
                      <div className="flex items-center gap-4 pt-4">
                        <button 
                          type="submit" 
                          disabled={profileLoading} 
                          className="claude-btn-primary px-8 py-2.5 flex items-center gap-2 min-w-[140px] justify-center text-[14px]"
                        >
                          {profileLoading ? (
                            <i className="pi pi-spin pi-spinner" />
                          ) : (
                            "Update Profile"
                          )}
                        </button>
                        {profileSuccess && <span className="text-green-500 text-[13px] font-medium"><i className="pi pi-check-circle mr-1" /> {profileSuccess}</span>}
                        {profileError && <span className="text-red-500 text-[13px] font-medium"><i className="pi pi-times-circle mr-1" /> {profileError}</span>}
                      </div>
                    </form>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "account" && (
              <div className="space-y-8 animate-fade-in">
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Security Settings</h2>
                  
                  {/* Password Section */}
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden mb-6">
                    <div className="p-6 flex items-center justify-between hover:bg-[var(--nav-hover-bg)]/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                          <i className="pi pi-lock text-lg" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Password</h3>
                          <p className="text-[13px] text-[var(--text-muted)]">Set a unique password to protect your account.</p>
                        </div>
                      </div>
                      <Button 
                        label={showPasswordForm ? "Cancel" : "Change Password"} 
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className={showPasswordForm ? "p-button-text p-button-secondary" : "p-button-primary px-6"} 
                      />
                    </div>

                    {showPasswordForm && (
                      <div className="px-6 pb-6 pt-2 border-t border-[var(--border-subtle)] animate-slide-up bg-[var(--bg-canvas)]/20">
                        <form onSubmit={handlePasswordUpdate} className="max-w-md space-y-6 pt-4">
                          <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                              <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Current Password</label>
                              <Password 
                                value={passwordForm.currentPassword} 
                                onChange={(e) => setPasswordForm(p => ({...p, currentPassword: e.target.value}))} 
                                toggleMask 
                                feedback={false}
                                className="w-full"
                                inputClassName="w-full"
                                placeholder="Current password"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[13px] font-semibold text-[var(--text-secondary)]">New Password</label>
                                <Password 
                                  value={passwordForm.newPassword} 
                                  onChange={(e) => setPasswordForm(p => ({...p, newPassword: e.target.value}))} 
                                  toggleMask 
                                  promptLabel="Choose a strong password"
                                  appendTo="self"
                                  className="w-full"
                                  inputClassName="w-full"
                                  placeholder="New password"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Confirm New Password</label>
                              <Password 
                                value={passwordForm.confirmPassword} 
                                onChange={(e) => setPasswordForm(p => ({...p, confirmPassword: e.target.value}))} 
                                toggleMask 
                                feedback={false}
                                className="w-full"
                                inputClassName="w-full"
                                placeholder="Confirm new password"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-subtle)]">
                            <button 
                              type="submit" 
                              disabled={passwordLoading} 
                              className="claude-btn-primary w-full py-3 flex items-center justify-center gap-2 text-[14px] font-bold"
                            >
                              {passwordLoading ? (
                                <i className="pi pi-spin pi-spinner" />
                              ) : (
                                "Update Password"
                              )}
                            </button>
                          </div>
                          {passwordSuccess && <p className="text-green-500 text-[13px] font-medium text-center">{passwordSuccess}</p>}
                          {passwordError && <p className="text-red-500 text-[13px] font-medium text-center">{passwordError}</p>}
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Two-Factor Authentication Section */}
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden mb-6">
                    <div className="p-6 flex items-center justify-between hover:bg-[var(--nav-hover-bg)]/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                          <i className="pi pi-shield text-lg" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Two-Factor Authentication</h3>
                          <p className="text-[13px] text-[var(--text-muted)]">Add an extra layer of security to your account.</p>
                        </div>
                      </div>
                      <Button 
                        label={twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"} 
                        onClick={toggleTwoFactor}
                        className={twoFactorEnabled ? "p-button-danger p-button-outlined px-6" : "p-button-success px-6"} 
                      />
                    </div>

                    {show2FA && (
                      <div className="px-6 pb-6 pt-2 border-t border-[var(--border-subtle)] animate-slide-up bg-[var(--bg-canvas)]/20">
                        <div className="max-w-md space-y-4 pt-4">
                          <p className="text-[13px] text-[var(--text-muted)]">
                            Two-factor authentication adds an extra layer of security. You'll need to enter a code from your authenticator app when logging in.
                          </p>
                          <Button 
                            label={twoFactorEnabled ? "Deactivate 2FA" : "Setup 2FA"} 
                            onClick={() => {
                              setTwoFactorEnabled(!twoFactorEnabled);
                              setShow2FA(false);
                            }}
                            className={twoFactorEnabled ? "p-button-danger w-full" : "p-button-success w-full"} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Sessions Section */}
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden mb-6">
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                          <i className="pi pi-server text-lg" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Active Sessions</h3>
                          <p className="text-[13px] text-[var(--text-muted)]">Manage your active login sessions.</p>
                        </div>
                      </div>
                      <div className="bg-[var(--bg-canvas)]/50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-[13px]">
                            <p className="text-[var(--text-primary)] font-medium">Current Session</p>
                            <p className="text-[var(--text-muted)]">Last active: Just now</p>
                          </div>
                          <span className="text-green-500 text-[12px] font-semibold">ACTIVE</span>
                        </div>
                      </div>
                      <Button 
                        label="Sign Out All Other Sessions" 
                        onClick={() => {}}
                        className="p-button-outlined w-full mt-4" 
                      />
                    </div>
                  </div>

                  {/* Login History Section */}
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden mb-6">
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                          <i className="pi pi-history text-lg" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Login History</h3>
                          <p className="text-[13px] text-[var(--text-muted)]">View your recent login activity.</p>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        <div className="bg-[var(--bg-canvas)]/50 rounded-lg p-3 text-[13px]">
                          <p className="text-[var(--text-primary)] font-medium">Today at 2:45 PM</p>
                          <p className="text-[var(--text-muted)]">Chrome on Windows</p>
                        </div>
                        <div className="bg-[var(--bg-canvas)]/50 rounded-lg p-3 text-[13px]">
                          <p className="text-[var(--text-primary)] font-medium">Yesterday at 10:15 AM</p>
                          <p className="text-[var(--text-muted)]">Firefox on Windows</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Danger Zone */}
                <section className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                  <h3 className="text-red-600 dark:text-red-400 font-bold mb-2">Danger Zone</h3>
                  <p className="text-[13px] text-[var(--text-muted)] mb-6">Once you delete your account, there is no going back. Please be certain.</p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">Delete Account</p>
                      <p className="text-[12px] text-[var(--text-muted)]">Permanently delete your account and all data</p>
                    </div>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg transition-all duration-200 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/40 active:scale-95"
                    >
                      Delete Account
                    </button>
                  </div>

                  {/* Delete Confirmation Modal */}
                  {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                      <div className="bg-[var(--bg-surface)] rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-up">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <i className="pi pi-exclamation-triangle text-red-600 text-lg" />
                          </div>
                          <h4 className="text-lg font-bold text-red-600">Delete Account?</h4>
                        </div>
                        
                        <p className="text-[13px] text-[var(--text-muted)] mb-6 leading-relaxed">
                          This action is permanent and irreversible. Your account and all associated data will be deleted.
                        </p>
                        
                        <div className="flex gap-3">
                          <Button 
                            label="Cancel" 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="p-button-outlined flex-1" 
                          />
                          <Button 
                            label={deleteLoading ? "Deleting..." : "Delete"} 
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                            className="p-button-danger flex-1" 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeSection === "appearance" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Interface Customization</h2>
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 space-y-10">
                    {/* Theme Mode Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Theme Mode</h3>
                          <p className="text-[13px] text-[var(--text-muted)] mt-1">Switch between light and dark interface.</p>
                        </div>
                        <Button 
                          icon={isDarkMode ? "pi pi-sun" : "pi pi-moon"} 
                          label={isDarkMode ? "Light Mode" : "Dark Mode"} 
                          className={isDarkMode ? "p-button-outlined p-button-warning px-6" : "p-button-outlined p-button-secondary px-6"}
                          onClick={toggleTheme}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${!isDarkMode ? "border-[var(--accent)] bg-[var(--accent-subtle)]" : "border-[var(--border-subtle)] hover:border-[var(--text-muted)]"}`} onClick={() => { if (isDarkMode) toggleTheme(); }}>
                          <i className="pi pi-sun text-2xl text-amber-500 mb-2" />
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Light</p>
                        </div>
                        <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isDarkMode ? "border-[var(--accent)] bg-[var(--accent-subtle)]" : "border-[var(--border-subtle)] hover:border-[var(--text-muted)]"}`} onClick={() => { if (!isDarkMode) toggleTheme(); }}>
                          <i className="pi pi-moon text-2xl text-slate-600 mb-2" />
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Dark</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border-subtle)] pt-8">
                      {/* Accent Color Section */}
                      <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Accent Color</h3>
                      <p className="text-[13px] text-[var(--text-muted)] mt-1 mb-6">Personalize the primary highlights and buttons.</p>
                      <div className="flex flex-wrap gap-6">
                        {["#4F46E5", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#0ea5e9"].map(color => (
                          <div 
                            key={color} 
                            className={`w-16 h-16 rounded-full cursor-pointer border-4 transition-all shadow-md flex items-center justify-center hover:scale-110 hover:shadow-xl
                              ${accentColor === color ? "border-[var(--text-primary)] scale-105" : "border-transparent opacity-75 hover:opacity-100"}`}
                            style={{ backgroundColor: color }}
                            onClick={() => updateAccentColor(color)}
                            title={color}
                          >
                            {accentColor === color && <i className="pi pi-check text-white text-xl font-bold" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[var(--border-subtle)] pt-8">
                      {/* Compact Mode Section */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Compact Mode</h3>
                          <p className="text-[13px] text-[var(--text-muted)] mt-1">Reduce spacing for a more compact layout.</p>
                        </div>
                        <Button 
                          icon="pi pi-check" 
                          label="Coming Soon" 
                          className="p-button-outlined p-button-secondary px-6 opacity-50 cursor-not-allowed" 
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "audio-video" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Calling Preferences</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Audio Settings */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                          <i className="pi pi-volume-up text-lg" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Audio Settings</h3>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Input Microphone</label>
                        <Dropdown 
                          value={selectedDevices.mic} 
                          options={devices.audioIn} 
                          optionLabel="label" 
                          optionValue="value"
                          placeholder={devices.audioIn.length > 0 ? "Select Microphone" : "No microphones found"}
                          onChange={(e) => {
                            setSelectedDevices(prev => ({...prev, mic: e.value}));
                            localStorage.setItem("preferred-mic", e.value);
                          }}
                          className="w-full h-10 text-[13px]"
                          panelClassName="!bg-[var(--bg-surface)] !border-[var(--border-subtle)] !text-[var(--text-primary)]"
                          disabled={devices.audioIn.length === 0}
                        />
                        <p className="text-[11px] text-[var(--text-muted)] mt-1"><i className="pi pi-info-circle text-xs" /> {selectedDevices.mic ? `Using: ${devices.audioIn.find(d => d.value === selectedDevices.mic)?.label || 'Default'}` : 'Default microphone'}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Output Speaker</label>
                        <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-3 text-[13px] text-[var(--text-muted)]">
                          <i className="pi pi-check-circle text-green-500 mr-2" /> Default Output Device (System Audio)
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1"><i className="pi pi-info-circle text-xs" /> Uses your system's default speaker setting</p>
                      </div>
                    </div>

                    {/* Video Settings */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                          <i className="pi pi-video text-lg" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Video Settings</h3>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Video Camera</label>
                        <Dropdown 
                          value={selectedDevices.camera} 
                          options={devices.videoIn} 
                          optionLabel="label" 
                          optionValue="value"
                          placeholder={devices.videoIn.length > 0 ? "Select Camera" : "No cameras found"}
                          onChange={(e) => {
                            setSelectedDevices(prev => ({...prev, camera: e.value}));
                            localStorage.setItem("preferred-camera", e.value);
                          }}
                          className="w-full h-10 text-[13px]"
                          panelClassName="!bg-[var(--bg-surface)] !border-[var(--border-subtle)] !text-[var(--text-primary)]"
                          disabled={devices.videoIn.length === 0}
                        />
                        <p className="text-[11px] text-[var(--text-muted)] mt-1"><i className="pi pi-info-circle text-xs" /> {selectedDevices.camera ? `Using: ${devices.videoIn.find(d => d.value === selectedDevices.camera)?.label || 'First camera'}` : 'Default camera'}</p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-[12px] text-blue-700 dark:text-blue-300">
                          <i className="pi pi-exclamation-circle mr-2" />
                          Allow camera and microphone access in your browser settings for better call quality.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "accessibility" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Accessibility Options</h2>
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 space-y-8">
                    {/* Text Size Section */}
                    <div>
                      <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-4">Text Size</h3>
                      <div className="flex items-center gap-4">
                        <span className="text-[12px] text-[var(--text-muted)]">A</span>
                        <input 
                          type="range" 
                          min="0.8" 
                          max="1.3" 
                          step="0.05" 
                          value={textSize}
                          onChange={(e) => updateTextSize(parseFloat(e.target.value))}
                          className="flex-1 cursor-pointer h-2 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]"
                        />
                        <span className="text-[20px] text-[var(--text-muted)]">A</span>
                        <span className="text-[13px] text-[var(--text-secondary)] font-semibold min-w-[50px]">{Math.round(textSize * 100)}%</span>
                      </div>
                      <p className="text-[12px] text-[var(--text-muted)] mt-2">Current: {(textSize * 16).toFixed(1)}px</p>
                    </div>

                    <div className="border-t border-[var(--border-subtle)] pt-8">
                      <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-4">Reduced Motion</h3>
                      <p className="text-[13px] text-[var(--text-muted)] mb-4">Minimize animations and transitions for a more static interface.</p>
                      <Button 
                        label={reducedMotion ? "Animations Disabled" : "Enable Reduced Motion"} 
                        icon={reducedMotion ? "pi pi-check" : "pi pi-video-off"}
                        onClick={toggleReducedMotion}
                        className={reducedMotion ? "p-button-success px-6" : "p-button-outlined px-6"}
                      />
                      {reducedMotion && <p className="text-green-500 text-[12px] font-medium mt-3"><i className="pi pi-check-circle mr-1" /> Animations are now disabled</p>}
                    </div>

                    <div className="border-t border-[var(--border-subtle)] pt-8">
                      <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-4">Color Contrast</h3>
                      <p className="text-[13px] text-[var(--text-muted)] mb-4">Increase color contrast for better visibility and readability.</p>
                      <Button 
                        label={highContrast ? "High Contrast On" : "Enable High Contrast"} 
                        icon={highContrast ? "pi pi-check" : "pi pi-palette"}
                        onClick={toggleHighContrast}
                        className={highContrast ? "p-button-success px-6" : "p-button-outlined px-6"}
                      />
                      {highContrast && <p className="text-green-500 text-[12px] font-medium mt-3"><i className="pi pi-check-circle mr-1" /> High contrast mode is now enabled</p>}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Notification Preferences</h2>
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 space-y-6">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between pb-6 border-b border-[var(--border-subtle)]">
                      <div>
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Email Notifications</h3>
                        <p className="text-[13px] text-[var(--text-muted)] mt-1">Receive updates about your account via email.</p>
                      </div>
                      <Button 
                        label="Manage" 
                        className="p-button-text p-button-primary px-6"
                      />
                    </div>

                    {/* Push Notifications */}
                    <div className="flex items-center justify-between pb-6 border-b border-[var(--border-subtle)]">
                      <div>
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Push Notifications</h3>
                        <p className="text-[13px] text-[var(--text-muted)] mt-1">Get real-time notifications on your device.</p>
                      </div>
                      <Button 
                        label="Manage" 
                        className="p-button-text p-button-primary px-6"
                      />
                    </div>

                    {/* Desktop Notifications */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Desktop Notifications</h3>
                        <p className="text-[13px] text-[var(--text-muted)] mt-1">Show notifications on your desktop.</p>
                      </div>
                      <Button 
                        label="Enable" 
                        className="p-button-success px-6"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}
