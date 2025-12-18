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
    sm: { icon: 'w-8 h-8', text: 'text-lg', subtext: 'text-[10px]' },
    md: { icon: 'w-10 h-10', text: 'text-xl', subtext: 'text-xs' },
    lg: { icon: 'w-14 h-14', text: 'text-3xl', subtext: 'text-sm' },
  };

  const colors = {
    light: { 
      text: 'text-white', 
      subtext: 'text-slate-300',
      iconBg: 'from-blue-500 via-blue-600 to-indigo-700'
    },
    dark: { 
      text: 'text-slate-900', 
      subtext: 'text-slate-500',
      iconBg: 'from-blue-500 via-blue-600 to-indigo-700'
    },
  };

  const content = (
    <div className="flex items-center gap-3">
      {/* Logo Icon - Modern K with arrow */}
      <div className={`${sizes[size].icon} relative`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${colors[variant].iconBg} rounded-xl shadow-lg`}>
          {/* Stylized K with upward arrow */}
          <svg 
            viewBox="0 0 40 40" 
            fill="none" 
            className="w-full h-full p-1.5"
          >
            {/* K letter stylized */}
            <path 
              d="M12 8V32M12 20L22 8M12 20L26 32" 
              stroke="white" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            {/* Upward arrow representing growth */}
            <path 
              d="M28 16L28 8M28 8L24 12M28 8L32 12" 
              stroke="white" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              opacity="0.9"
            />
          </svg>
        </div>
        {/* Subtle glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors[variant].iconBg} rounded-xl blur-md opacity-40 -z-10`} />
      </div>

      {/* Text */}
      <div className="flex flex-col">
        <span className={`${colors[variant].text} font-display font-bold ${sizes[size].text} leading-tight tracking-tight`}>
          Kantama
        </span>
        {showSubtext && (
          <span className={`${colors[variant].subtext} ${sizes[size].subtext} font-medium uppercase tracking-widest`}>
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

