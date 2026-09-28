import React, { useState } from 'react';
import { X, Users, KeyRound, LogOut, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatName } from '../utils/formatName';

export function AccountSettingsModal({ isOpen, onClose }) {
  const { user, connectUser, disconnectUser, updatePin, logout } = useAuth();

  // Connected user states
  const [targetUsername, setTargetUsername] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState('');
  const [isChangingConnected, setIsChangingConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Change PIN states
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  if (!isOpen || !user) return null;

  const handleConnect = async (e) => {
    e.preventDefault();
    setConnectError('');
    setConnectSuccess('');
    setIsConnecting(true);

    const res = await connectUser(targetUsername);
    setIsConnecting(false);

    if (res.success) {
      setConnectSuccess(`Successfully connected to ${formatName(res.linkedUser.username)}`);
      setTargetUsername('');
      setIsChangingConnected(false);
      setTimeout(() => setConnectSuccess(''), 4000);
    } else {
      setConnectError(res.error || 'Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    setConnectError('');
    setConnectSuccess('');
    const res = await disconnectUser();
    if (res.success) {
      setConnectSuccess('Account disconnected');
      setIsChangingConnected(false);
      setTimeout(() => setConnectSuccess(''), 3000);
    } else {
      setConnectError(res.error || 'Failed to disconnect');
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    setIsUpdatingPin(true);
    const res = await updatePin(newPin);
    setIsUpdatingPin(false);

    if (res.success) {
      setPinSuccess('PIN updated successfully!');
      setNewPin('');
      setTimeout(() => setPinSuccess(''), 4000);
    } else {
      setPinError(res.error || 'Failed to update PIN');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#18181B] border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-800/80">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Account Settings</h2>
            <p className="text-xs text-zinc-400">{formatName(user.username)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Connected Account */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <Users size={16} className="text-emerald-400" />
            <h3 className="text-sm font-medium text-zinc-200">Connected Account</h3>
          </div>
          <p className="text-xs text-zinc-400 mb-3.5 leading-relaxed">
            Connect a username to view or merge monthly dashboards.
          </p>

          {/* Success / Error alerts */}
          {connectSuccess && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <Check size={14} />
              <span>{connectSuccess}</span>
            </div>
          )}
          {connectError && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{connectError}</span>
            </div>
          )}

          {user.linked_user && !isChangingConnected ? (
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      {formatName(user.linked_user).charAt(0)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] border-2 border-zinc-900" />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 font-medium leading-none mb-1">Connected</div>
                    <div className="text-sm font-semibold text-zinc-200 leading-none">
                      {formatName(user.linked_user)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsChangingConnected(true);
                    setConnectError('');
                  }}
                  className="text-xs text-zinc-400 hover:text-emerald-400 underline underline-offset-2 transition-colors"
                >
                  Change
                </button>
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full py-2.5 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value.toLowerCase().trim().replace(/\s+/g, ''))}
                  placeholder="Enter target username"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex gap-2">
                {isChangingConnected && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingConnected(false);
                      setTargetUsername('');
                      setConnectError('');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!targetUsername || isConnecting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : user.linked_user ? 'Update Connection' : 'Connect'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Section 2: Change PIN */}
        <div className="mb-6 pt-5 border-t border-zinc-800/80">
          <div className="flex items-center gap-2 mb-1.5">
            <KeyRound size={16} className="text-emerald-400" />
            <h3 className="text-sm font-medium text-zinc-200">Change PIN</h3>
          </div>
          <p className="text-xs text-zinc-400 mb-3.5">
            Set a new 4-digit numeric PIN for this account.
          </p>

          {pinSuccess && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <Check size={14} />
              <span>{pinSuccess}</span>
            </div>
          )}
          {pinError && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePin} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter new 4-digit PIN"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 tracking-widest transition-colors"
            />
            <button
              type="submit"
              disabled={newPin.length !== 4 || isUpdatingPin}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isUpdatingPin ? 'Updating PIN...' : 'Update PIN'}
            </button>
          </form>
        </div>

        {/* Section 3: Log Out */}
        <div className="pt-5 border-t border-zinc-800/80">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-red-400 font-medium text-xs flex items-center justify-center gap-2 transition-colors active:scale-98"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
