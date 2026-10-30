import React, { useState } from 'react';
import {
  ShieldCheck,
  ClipboardList,
  Lock,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
  KeyRound,
  Info,
  Sparkles,
} from 'lucide-react';
import { AuthUser, UserRole } from '../types/press';
import { getStoredCredentials } from '../utils/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: AuthUser) => void;
  currentUser: AuthUser | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  currentUser,
}) => {
  if (!isOpen) return null;

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    currentUser?.role || 'ADMIN'
  );
  const [pin, setPin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const creds = getStoredCredentials();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    setPin('');
  };

  const handleQuickLogin = (role: UserRole) => {
    const user: AuthUser = {
      role,
      username: role === 'ADMIN' ? 'admin' : 'supervisor',
      name: role === 'ADMIN' ? 'Head Administrator' : 'Shift Supervisor',
      email: role === 'ADMIN' ? 'kv525411@gmail.com' : undefined,
      loggedInAt: Date.now(),
    };
    onLogin(user);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetPin = selectedRole === 'ADMIN' ? creds.adminPin : creds.supervisorPin;
    const isMasterPassword =
      selectedRole === 'ADMIN'
        ? pin === 'admin123' || pin === targetPin
        : pin === 'super123' || pin === targetPin;

    if (!isMasterPassword && pin.trim() !== '') {
      setError(`Incorrect PIN or password for ${selectedRole} role. (Default: ${targetPin})`);
      return;
    }

    const defaultName = selectedRole === 'ADMIN' ? 'Head Administrator' : 'Shift Supervisor';
    const user: AuthUser = {
      role: selectedRole,
      username: selectedRole === 'ADMIN' ? 'admin' : 'supervisor',
      name: displayName.trim() || defaultName,
      email: selectedRole === 'ADMIN' ? 'kv525411@gmail.com' : undefined,
      loggedInAt: Date.now(),
    };

    onLogin(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-inner">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">System Login & Role Access</h2>
              <p className="text-xs text-slate-300">
                PressPro MES Factory Management System
              </p>
            </div>
          </div>
          {currentUser && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Role Selector Cards */}
        <div className="p-6 space-y-5 text-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Select Your Access Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Admin Card */}
              <button
                type="button"
                onClick={() => handleRoleSelect('ADMIN')}
                className={`relative p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  selectedRole === 'ADMIN'
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-amber-500 text-white shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    {selectedRole === 'ADMIN' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">ADMIN</h3>
                  <p className="text-[11px] text-amber-900 font-semibold mt-0.5">
                    All Access Privilege
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  Add employees, manage day-wise data, lock/unlock, full control.
                </p>
              </button>

              {/* Supervisor Card */}
              <button
                type="button"
                onClick={() => handleRoleSelect('SUPERVISOR')}
                className={`relative p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  selectedRole === 'SUPERVISOR'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                      <ClipboardList className="w-5 h-5" />
                    </span>
                    {selectedRole === 'SUPERVISOR' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">SUPERVISOR</h3>
                  <p className="text-[11px] text-blue-800 font-semibold mt-0.5">
                    Punch Data Only
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  Punch operational numbers. Cannot add employees.
                </p>
              </button>
            </div>
          </div>

          {/* Role Policy Notice */}
          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              selectedRole === 'ADMIN'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <div>
              {selectedRole === 'ADMIN' ? (
                <>
                  <span className="font-bold">Admin Privileges:</span> Complete control over
                  Day-Wise data, creating new employees, configuring targets, adjusting wages, and
                  locking shift dates.
                </>
              ) : (
                <>
                  <span className="font-bold">Supervisor Policy:</span> Authorized only to punch
                  production data (press run, good/rejection, moisture, BD).{' '}
                  <span className="font-semibold underline">Adding employees is restricted to Admin.</span>
                </>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {selectedRole === 'ADMIN' ? 'Admin Passcode / PIN' : 'Supervisor PIN'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={
                    selectedRole === 'ADMIN'
                      ? `Default PIN: ${creds.adminPin} or 'admin123'`
                      : `Default PIN: ${creds.supervisorPin} or 'super123'`
                  }
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tip: Press &quot;Quick 1-Click Login&quot; below or enter PIN (Admin:{' '}
                <span className="font-mono font-bold text-slate-700">{creds.adminPin}</span>, Supervisor:{' '}
                <span className="font-mono font-bold text-slate-700">{creds.supervisorPin}</span>)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name (Optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={
                    selectedRole === 'ADMIN'
                      ? 'e.g. Administrator / kv525411'
                      : 'e.g. Day Shift Supervisor Sharma'
                  }
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className={`w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 active:scale-98 ${
                  selectedRole === 'ADMIN'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                <span>Log In as {selectedRole}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-2 text-[10px] uppercase font-bold text-slate-400">
                  Instant Test Login
                </span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN')}
                  className="py-2 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Admin 1-Click</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('SUPERVISOR')}
                  className="py-2 px-2.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Supervisor 1-Click</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
