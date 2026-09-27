import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, RotateCcw } from 'lucide-react';

export function LoginScreen() {
  const { login, savedUsername, setSavedUsername } = useAuth();
  const [username, setUsername] = useState(savedUsername || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(!savedUsername);
  const [loading, setLoading] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmitPin = useCallback(async (newPin) => {
    if (!username) {
      setError('Please enter username');
      triggerShake();
      setPin('');
      return;
    }
    setLoading(true);
    const result = await login(username, newPin);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      triggerShake();
      setPin('');
    }
  }, [username, login]);

  const handleKeypad = useCallback(async (num) => {
    if (loading) return;
    setPin(prev => {
      if (prev.length >= 4) return prev;
      const newPin = prev + num;
      setError('');
      if (newPin.length === 4) {
        handleSubmitPin(newPin);
      }
      return newPin;
    });
  }, [loading, handleSubmitPin]);

  const handleDelete = useCallback(() => {
    if (loading) return;
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, [loading]);

  // Physical keyboard support — skip when user is typing in an input/textarea
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key >= '0' && e.key <= '9') {
        handleKeypad(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKeypad, handleDelete]);

  const switchUser = () => {
    setIsEditingUsername(true);
    setPin('');
    setError('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-emerald-500/10 to-transparent" />
        <div className="absolute -top-[20%] -right-[20%] w-[70%] h-[70%] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-6">
          <Leaf size={36} className="text-zinc-950" />
        </div>

        {/* Brand */}
        <h1 className="text-3xl font-semibold mb-2">ExpenseLeaf</h1>
        <p className="text-zinc-400 text-sm mb-12">Track simply. Spend mindfully.</p>

        <div className={`w-full transition-transform ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>

          {/* Username section */}
          {isEditingUsername ? (
            <div className="mb-8 w-full relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                onBlur={(e) => setUsername(e.target.value.trim().toLowerCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.target.blur();
                    setIsEditingUsername(false);
                  }
                }}
                placeholder="Enter username"
                autoFocus
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center outline-none focus:border-emerald-500 text-zinc-100 transition-colors"
              />
              {savedUsername && (
                <button
                  onClick={() => { setUsername(savedUsername); setIsEditingUsername(false); }}
                  className="text-xs text-zinc-500 hover:text-emerald-500 transition-colors mt-2 absolute right-0 -bottom-6"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <div className="mb-8 flex flex-col items-center gap-2">
              {/* Interactive pill — tap to switch user */}
              <button
                onClick={switchUser}
                className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl px-5 py-3 text-zinc-100 flex items-center gap-3 transition-all active:scale-95"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <span className="font-medium">{username}</span>
                <RotateCcw
                  size={14}
                  className="text-zinc-500 group-hover:text-emerald-500 transition-colors ml-1"
                />
              </button>
              <span className="text-[11px] text-zinc-600">Tap to switch user</span>
            </div>
          )}

          {/* PIN dots */}
          <div className="flex gap-4 justify-center mb-8">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  pin.length > i
                    ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-110'
                    : 'border-zinc-700 bg-transparent'
                }`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {error}
            </p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-y-5 gap-x-4 max-w-[240px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeypad(num.toString())}
                disabled={loading}
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light hover:bg-zinc-800/60 active:bg-zinc-800 active:scale-95 transition-all mx-auto select-none"
              >
                {num}
              </button>
            ))}
            <div />
            <button
              onClick={() => handleKeypad('0')}
              disabled={loading}
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light hover:bg-zinc-800/60 active:bg-zinc-800 active:scale-95 transition-all mx-auto select-none"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl text-zinc-400 hover:bg-zinc-800/60 active:bg-zinc-800 active:scale-95 transition-all mx-auto select-none"
            >
              ⌫
            </button>
          </div>

          {loading && (
            <div className="flex justify-center mt-6">
              <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
