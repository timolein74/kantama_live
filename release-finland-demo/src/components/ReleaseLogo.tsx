interface ReleaseLogoProps {
  className?: string;
  height?: number;
}

/**
 * Release Finland Oy official logo
 * Black text with red "e" accent
 */
export default function ReleaseLogo({ className = '', height = 32 }: ReleaseLogoProps) {
  const width = height * 4; // Aspect ratio approximately 4:1
  
  return (
    <svg 
      viewBox="0 0 200 50" 
      height={height} 
      width={width}
      className={className}
      aria-label="Release"
    >
      {/* R */}
      <text x="0" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="42" fontWeight="900" fill="#000000">R</text>
      {/* e - RED */}
      <text x="28" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="42" fontWeight="900" fill="#E31937">e</text>
      {/* lease */}
      <text x="52" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="42" fontWeight="900" fill="#000000">lease</text>
    </svg>
  );
}



