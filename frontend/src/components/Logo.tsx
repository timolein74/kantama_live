import { Link } from 'react-router-dom';

interface LogoProps {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export default function Logo({ 
  to = '/', 
  size = 'md', 
  variant = 'light',
}: LogoProps) {
  const sizes = {
    sm: { icon: 'h-7 w-7', text: 'text-lg' },
    md: { icon: 'h-9 w-9', text: 'text-xl' },
    lg: { icon: 'h-12 w-12', text: 'text-2xl' },
  };

  const colors = {
    light: 'text-white',
    dark: 'text-slate-900',
  };

  const content = (
    <div className="flex items-center gap-2">
      <img 
        src="/juuri-logo.svg" 
        alt="Juuri" 
        className={`${sizes[size].icon} rounded-lg`}
      />
      <span className={`${colors[variant]} font-display font-bold ${sizes[size].text} tracking-tight`}>
        <span className="text-green-500">Juuri</span> Rahoitus
      </span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

