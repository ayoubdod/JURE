interface LogoLoadingProps {
  /** Use full-screen centered layout (default: true) */
  fullScreen?: boolean;
  /** Custom logo URL (default: cropped Jure wordmark) */
  logoUrl?: string;
  /** Size of the logo: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message below the loader */
  message?: string;
}

const sizeClasses = {
  sm: 'h-16 w-auto',
  md: 'h-24 w-auto',
  lg: 'h-28 w-auto',
};

const DEFAULT_LOGO = '/images/jure-wordmark.png';

const LogoLoading = ({
  fullScreen = true,
  logoUrl = DEFAULT_LOGO,
  size = 'lg',
  message,
}: LogoLoadingProps) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6" role="status" aria-busy="true">
      <div className="relative">
        <img
          src={logoUrl}
          alt="Loading"
          className={`${sizeClasses[size]} object-contain animate-logo-breathe`}
        />
        <div className="mt-6 flex justify-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full bg-jure-500 animate-logo-dot"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-jure-500 animate-logo-dot"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-jure-500 animate-logo-dot"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return content;
};

export default LogoLoading;
