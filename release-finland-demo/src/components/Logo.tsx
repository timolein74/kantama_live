import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

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
    sm: { icon: 'w-6 h-6', iconInner: 'w-4 h-4', text: 'text-lg' },
    md: { icon: 'w-8 h-8', iconInner: 'w-5 h-5', text: 'text-xl' },
    lg: { icon: 'w-10 h-10', iconInner: 'w-6 h-6', text: 'text-2xl' },
  };

  const colors = {
    light: 'text-white',
    dark: 'text-slate-900',
  };

  const content = (
    <div className="flex items-center space-x-2">
      <div className={`${sizes[size].icon} bg-gradient-to-br from-emerald-500 to-teal-700 rounded-lg flex items-center justify-center`}>
        <Building2 className={`${sizes[size].iconInner} text-white`} />
      </div>
      <span className={`${colors[variant]} font-display font-bold ${sizes[size].text} tracking-tight`}>
        Demo
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
