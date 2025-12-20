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
    sm: { text: 'text-lg' },
    md: { text: 'text-xl' },
    lg: { text: 'text-2xl' },
  };

  const colors = {
    light: 'text-white',
    dark: 'text-slate-900',
  };

  const content = (
    <span className={`${colors[variant]} font-display font-bold ${sizes[size].text} tracking-tight`}>
      Kantama Rahoitus
    </span>
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
