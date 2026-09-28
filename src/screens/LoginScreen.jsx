import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, RotateCcw } from 'lucide-react';
import { formatName } from '../utils/formatName';

export function LoginScreen() {
  const { login, createAccount, savedUsername } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [username, setUsername] = useState(savedUsername || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(!savedUsername);
  const [loading, setLoading] = useState(false);

  const cleanUsername = (str) => str.toLowerCase().replace(/\s+/g, '');

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmitPin = useCallback(async (newPin) => {
    const cleaned = cleanUsername(username);
    if (!cleaned) {
      setError(mode === 'signup' ? 'Please choose a username' : 'Please enter username');
      triggerShake();
      setPin('');
      return;
    }

    setLoading(true);
    if (mode === 'signup') {
      const result = await createAccount(cleaned, newPin);
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        triggerShake();
        setPin('');
      }
    } else {
      const result = await login(cleaned, newPin);
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        triggerShake();
        setPin('');
      }
    }
  }, [username, mode, login, createAccount]);

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

  const handleToggleMode = (newMode) => {
    setMode(newMode);
    setError('');
    setPin('');
    if (newMode === 'signin') {
      setUsername(savedUsername || '');
      setIsEditingUsername(!savedUsername);
    } else {
      setUsername('');
      setIsEditingUsername(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative bg-[#09090B]">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-emerald-500/10 to-transparent" />
        <div className="absolute -top-[20%] -right-[20%] w-[70%] h-[70%] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4">
          <Leaf size={36} className="text-zinc-950 stroke-[2.2]" />
        </div>

        {/* Brand */}
        <h1 className="text-3xl font-semibold mb-1 text-zinc-100 tracking-tight">ExpenseLeaf</h1>
        <p className="text-zinc-400 text-xs mb-8">Track simply. Spend mindfully.</p>

        <div className={`w-full transition-transform ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          {/* Sign In vs Sign Up UI */}
          {mode === 'signin' ? (
            /* Sign In Mode */
            !isEditingUsername && savedUsername ? (
              /* Sleek Matte-Black Profile Card for Returning User */
              <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-4 mb-6 w-full flex items-center justify-between shadow-lg text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-base">
                    {username ? username.charAt(0).toUpperCase() : <Leaf size={18} />}
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 block font-medium">Welcome back,</span>
                    <span className="text-sm font-semibold text-zinc-100">{formatName(username)}</span>
                  </div>
                </div>
                <button
                  onClick={switchUser}
                  className="text-xs text-zinc-400 hover:text-emerald-400 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-1.5"
                  title="Switch user"
                >
                  <RotateCcw size={12} />
                  <span>Switch</span>
                </button>
              </div>
            ) : (
              /* Username Input for Sign In */
              <div className="mb-6 w-full relative text-left">
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(cleanUsername(e.target.value))}
                  onBlur={(e) => setUsername(cleanUsername(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                      if (savedUsername && cleanUsername(username) === savedUsername) {
                        setIsEditingUsername(false);
                      }
                    }
                  }}
                  placeholder="Enter username"
                  autoFocus
                  className="w-full bg-[#18181B] border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 text-zinc-100 transition-colors"
                />
                {savedUsername && (
                  <button
                    onClick={() => { setUsername(savedUsername); setIsEditingUsername(false); }}
                    className="text-xs text-zinc-500 hover:text-emerald-500 transition-colors mt-2 block text-right w-full"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )
          ) : (
            /* Create Account Mode */
            <div className="mb-6 w-full text-left">
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Desired Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(cleanUsername(e.target.value))}
                onBlur={(e) => setUsername(cleanUsername(e.target.value))}
                placeholder="Choose username (e.g. alex)"
                autoFocus
                className="w-full bg-[#18181B] border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 text-zinc-100 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5">No spaces, letters & numbers only</p>
            </div>
          )}

          {/* Subtitle for PIN */}
          <div className="text-xs text-zinc-400 mb-3 font-medium">
            {mode === 'signup' ? 'Set 4-Digit PIN' : 'Enter 4-Digit PIN'}
          </div>

          {/* PIN dots */}
          <div className="flex gap-4 justify-center mb-6">
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
            <p className="text-red-400 text-xs mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {error}
            </p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-y-4 gap-x-4 max-w-[240px] mx-auto">
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
            <div className="flex justify-center mt-5">
              <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        {/* Mode Toggle at bottom */}
        <div className="mt-8 pt-4 border-t border-zinc-800/60 w-full">
          {mode === 'signin' ? (
            <button
              onClick={() => handleToggleMode('signup')}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              New here? <span className="text-emerald-400 font-semibold hover:underline">Create an Account</span>
            </button>
          ) : (
            <button
              onClick={() => handleToggleMode('signin')}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Already have an account? <span className="text-emerald-400 font-semibold hover:underline">Sign In</span>
            </button>
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
