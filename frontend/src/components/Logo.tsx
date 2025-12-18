import { Link } from 'react-router-dom';

interface LogoProps {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showSubtext?: boolean;
}

export default function Logo({ 
  to = '/', 
  size = 'md', 
  variant = 'light',
  showSubtext = true 
}: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', gap: 'gap-2.5' },
    md: { icon: 'w-10 h-10', text: 'text-xl', gap: 'gap-3' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', gap: 'gap-3' },
  };

  const colors = {
    light: { 
      text: 'text-white', 
      subtext: 'text-white/90',
    },
    dark: { 
      text: 'text-slate-900', 
      subtext: 'text-slate-600',
    },
  };

  const content = (
    <div className={`flex items-center ${sizes[size].gap}`}>
      {/* Logo Icon - Abstract growth/reach symbol */}
      <div className={`${sizes[size].icon} relative flex-shrink-0`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-xl shadow-lg">
          {/* Glossy effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 via-transparent to-black/10" />
          
          <svg 
            viewBox="0 0 40 40" 
            fill="none" 
            className="w-full h-full p-1.5"
          >
            {/* Abstract rising bars - symbolizing growth/reach */}
            <rect x="6" y="22" width="6" height="12" rx="1.5" fill="white" opacity="0.7" />
            <rect x="14" y="14" width="6" height="20" rx="1.5" fill="white" opacity="0.85" />
            <rect x="22" y="8" width="6" height="26" rx="1.5" fill="white" />
            {/* Arrow pointing up-right - reaching forward */}
            <path 
              d="M30 6L34 6L34 10" 
              stroke="white" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M26 14L34 6" 
              stroke="white" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Text - Kantama Rahoitus */}
      <div className="flex items-baseline gap-2">
        <span className={`${colors[variant].text} font-display font-bold ${sizes[size].text} tracking-tight`}>
          Kantama
        </span>
        {showSubtext && (
          <span className={`${colors[variant].subtext} font-display font-medium ${sizes[size].text} tracking-tight`}>
            Rahoitus
          </span>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="flex items-center hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
