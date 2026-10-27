import React, { useState } from 'react';
type IconProps = React.SVGProps<SVGSVGElement>;

const Icon: React.FC<IconProps> = ({ children, ...props }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

const User = (props: IconProps) => <Icon {...props}><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></Icon>;
const Lock = (props: IconProps) => <Icon {...props}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>;
const ArrowRight = (props: IconProps) => <Icon {...props}><path d="M5 12h14M12 5l7 7-7 7" /></Icon>;
const AlertCircle = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></Icon>;
const LockKeyhole = (props: IconProps) => <Icon {...props}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4m-5 4v3" /><circle cx="12" cy="15" r="1" /></Icon>;

interface LoginFormProps {
  onSuccess: (data: { username: string }) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Caps Lock check for security/UX
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!username.trim()) {
      setErrorMsg('Please enter your staff username or employee email.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your retail account password.');
      return;
    }
    setIsLoading(true);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const result = await response.json() as {
        username?: string;
        displayName?: string;
        message?: string | string[];
      };

      if (!response.ok) {
        setErrorMsg(
          response.status === 401
            ? 'Invalid username or password.'
            : Array.isArray(result.message)
              ? result.message.join(' ')
              : result.message ?? 'Authentication service is unavailable.',
        );
        return;
      }

      onSuccess({
        username: result.displayName || result.username || username.trim(),
      });
    } catch (error) {
      setErrorMsg(
        error instanceof TypeError
          ? 'Could not connect to the authentication server.'
          : 'The authentication server returned an invalid response.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto">
      {/* Container Card (Deep Navy Blue Header accent with Crisp White body) */}
      <div className="bg-[#FFFCF8] rounded-2xl shadow-xl shadow-[#0D1B2A]/10 border border-[#E6E0D6] overflow-hidden transition-shadow duration-200 hover:shadow-2xl">
        
        {/* Card Header Strip: Deep Navy with a retail-red accent */}
        <div className="relative bg-[#0D1B2A] text-white p-6 sm:p-7 border-b border-[#FFD166]/30">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E5383B]" />

          {/* Mobile brand header (shown on smaller screens) */}
          <div className="flex items-center gap-3 mb-3 lg:hidden">
            <span className="inline-flex shrink-0 overflow-hidden rounded-2xl bg-white p-1 shadow-md">
              <img
                src="/srs-logo.png"
                alt="San Roque Supermarket"
                className="h-10 w-auto object-contain"
              />
            </span>
            <div>
              <div className="font-heading font-extrabold text-base uppercase tracking-tight text-white">
                San Roque Supermarket
              </div>
              <div className="text-[11px] font-bold text-[#FFD166] uppercase tracking-wider">
                Retail Systems Inc.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-heading">
               Aria Login Portal
              </h2>
              <p className="text-xs text-white/65 mt-1">
                Authorized Point-of-Sale & Store Operations Portal
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 text-[#FFD166] border border-white/10">
              <LockKeyhole className="w-4 h-4" />
            </div>
          </div>

        </div>

        {/* Card Body (Crisp White #F8F9FA background with Neutral Dark #212529 text) */}
        <div className="p-6 sm:p-7 bg-[#F7F4EF]">
          {errorMsg && (
            <div 
              role="alert"
              className="mb-5 p-3 rounded-xl bg-[#FDECEC] border border-[#E5383B]/25 text-xs text-[#E5383B] flex items-start gap-2.5 animate-shake"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Input (Mandatory) */}
            <div>
              <div className="mb-1.5">
                <label 
                  htmlFor="staff-username"
                  className="text-xs font-bold text-[#0D1B2A] uppercase tracking-wider flex items-center gap-1.5 font-heading"
                >
                  <User className="w-3.5 h-3.5 text-[#E5383B]" />
                  Username
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A8175]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="staff-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFCF8] text-[#212529] text-sm rounded-xl border border-[#E0D9CC] focus:outline-none focus:ring-2 focus:ring-[#E5383B] focus:border-transparent transition-all shadow-xs placeholder:text-[#A39888] font-medium"
                />
              </div>
            </div>

            {/* Password Input (Mandatory) */}
            <div>
              <div className="mb-1.5">
                <label 
                  htmlFor="staff-password"
                  className="text-xs font-bold text-[#0D1B2A] uppercase tracking-wider flex items-center gap-1.5 font-heading"
                >
                  <Lock className="w-3.5 h-3.5 text-[#E5383B]" />
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A8175]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="staff-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                  placeholder="Enter your system password"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFCF8] text-[#212529] text-sm rounded-xl border border-[#E0D9CC] focus:outline-none focus:ring-2 focus:ring-[#E5383B] focus:border-transparent transition-all shadow-xs placeholder:text-[#A39888] font-medium"
                />
              </div>

              {/* CapsLock Alert Indicator */}
              {capsLockActive && (
                <div className="mt-1.5 text-[11px] text-[#8A5A12] flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#FFD166]" />
                  <span>Caps Lock is ON</span>
                </div>
              )}
            </div>

            {/* Submit Button (Vibrant Retail Red #E5383B - Mandatory) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-xl bg-[#E5383B] hover:bg-[#c92a2d] active:scale-[0.99] text-white font-heading font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-[#E5383B]/25 hover:shadow-xl hover:shadow-[#E5383B]/35 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating Staff...</span>
                </>
              ) : (
                <>
                  <span>LOGIN TO RETAILS SYSTEM</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Card Footer Status (Deep Navy Bar) */}
        <div className="px-6 py-2.5 bg-[#0D1B2A] text-white/55 text-[11px] flex items-center justify-between border-t border-[#FFD166]/25">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFD166]" />
            <span className="text-white/80">San Roque Supermarket Retail Systems Inc.</span>
          </div>
          <span className="text-[#FFD166]/80 font-mono">Aria 3.10 Login</span>
        </div>
      </div>
    </div>
  );
};
