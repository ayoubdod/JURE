import React from 'react';

interface LogoLoadingProps {
  /** Use full-screen centered layout (default: true) */
  fullScreen?: boolean;
  /** Custom logo URL (default: Jure logo) */
  logoUrl?: string;
  /** Size of the logo: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message below the loader */
  message?: string;
}

const sizeClasses = {
  sm: 'h-12 w-auto',
  md: 'h-16 w-auto',
  lg: 'h-24 w-auto',
};

const LogoLoading = ({
  fullScreen = true,
  logoUrl = '/images/Jure logo.png',
  size = 'lg',
  message,
}: LogoLoadingProps) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Logo with pulse + subtle scale animation */}
      <div className="relative">
        <img
          src={logoUrl}
          alt="Loading"
          className={`${sizeClasses[size]} object-contain animate-logo-breathe`}
        />
        {/* Animated loading dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          <span
            className="w-2 h-2 rounded-full bg-jure-500 animate-logo-dot"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-jure-500 animate-logo-dot"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-jure-500 animate-logo-dot"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return content;
};

export default LogoLoading;
