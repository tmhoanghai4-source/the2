import React from 'react';

interface FileBrandLogoProps {
  extension?: string;
  language?: string;
  size?: number;
  className?: string;
}

export const FileBrandLogo: React.FC<FileBrandLogoProps> = ({
  extension = '',
  language = '',
  size = 24,
  className = '',
}) => {
  const ext = extension.toLowerCase().replace(/^\./, '');
  const lang = language.toLowerCase();
  const key = ext || lang;

  // Microsoft PowerPoint (.pptx / .ppt)
  if (key === 'pptx' || key === 'ppt') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="PowerPoint">
        <circle cx="18.5" cy="16" r="10.5" fill="#ED6C47" />
        <path d="M18.5 5.5A10.5 10.5 0 0 1 29 16H18.5V5.5Z" fill="#FF8F6B" />
        <path d="M18.5 16H29A10.5 10.5 0 0 1 18.5 26.5V16Z" fill="#D35230" />
        <rect x="3" y="8" width="15" height="16" rx="2.5" fill="#C43E1C" />
        <path
          d="M7.6 20.5V11.5H11.1C12.95 11.5 14.1 12.48 14.1 14.18C14.1 15.88 12.92 16.9 11.02 16.9H9.52V20.5H7.6ZM9.52 15.32H10.8C11.72 15.32 12.22 14.9 12.22 14.18C12.22 13.45 11.72 13.06 10.8 13.06H9.52V15.32Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Microsoft Word (.docx / .doc)
  if (key === 'docx' || key === 'doc') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Word">
        <rect x="10" y="5" width="18" height="22" rx="2.2" fill="#41A5EE" />
        <path d="M10 10.5H28V16H10V10.5Z" fill="#2B7CD3" />
        <path d="M10 16H28V21.5H10V16Z" fill="#185ABD" />
        <path d="M10 21.5H28V24.8C28 26.015 27.015 27 25.8 27H12.2C10.985 27 10 26.015 10 24.8V21.5Z" fill="#103F91" />
        <rect x="3" y="8" width="15" height="16" rx="2.5" fill="#185ABD" />
        <path
          d="M6.2 12H8L9.2 17.5L10.65 12H12.2L13.65 17.5L14.85 12H16.65L14.55 20.3H12.85L11.42 15.05L10 20.3H8.3L6.2 12Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Adobe PDF (.pdf)
  if (key === 'pdf') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="PDF">
        <rect x="4" y="3" width="24" height="26" rx="3.5" fill="#E11D48" />
        <path d="M20 3L28 11H21.5C20.67 11 20 10.33 20 9.5V3Z" fill="#FDA4AF" />
        <path
          d="M15.8 10.2C15.1 10.2 14.9 11.4 15.3 13.1C14.8 14.6 14.0 16.4 13.0 18.0C11.2 18.7 9.5 19.6 9.3 20.7C9.1 21.5 10.1 22.0 11.1 21.3C12.1 20.6 13.1 19.3 13.9 18.1C15.4 17.5 17.1 17.1 18.6 17.0C19.8 18.1 21.1 18.9 22.0 18.7C22.9 18.5 23.1 17.4 22.4 16.7C21.6 15.9 20.1 15.9 18.9 16.2C17.8 15.2 16.8 14.0 16.2 12.9C16.5 11.3 16.5 10.2 15.8 10.2Z"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Excel (.xlsx / .xls / .csv)
  if (key === 'xlsx' || key === 'xls' || key === 'csv') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Excel">
        <rect x="10" y="5" width="18" height="22" rx="2.2" fill="#33C481" />
        <path d="M10 16H28V24.8C28 26.015 27.015 27 25.8 27H12.2C10.985 27 10 26.015 10 24.8V16Z" fill="#107C41" />
        <rect x="3" y="8" width="15" height="16" rx="2.5" fill="#185C37" />
        <path d="M7.3 12L10.5 16L7.2 20H9.3L11.5 17.1L13.7 20H15.8L12.5 16L15.7 12H13.6L11.5 14.8L9.4 12H7.3Z" fill="#FFFFFF" />
      </svg>
    );
  }

  // ZIP Archive
  if (key === 'zip' || key === 'rar' || key === '7z' || key === 'tar') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Archive">
        <rect x="5" y="4" width="22" height="24" rx="4" fill="#7C3AED" />
        <rect x="14" y="4" width="4" height="24" fill="#DDD6FE" fillOpacity="0.28" />
        <rect x="14.5" y="7" width="3" height="2" rx="0.5" fill="#FFFFFF" />
        <rect x="14.5" y="11" width="3" height="2" rx="0.5" fill="#FFFFFF" />
        <rect x="14.5" y="15" width="3" height="2" rx="0.5" fill="#FFFFFF" />
        <rect x="13" y="19" width="6" height="5" rx="1.2" fill="#FFFFFF" />
      </svg>
    );
  }

  // Python (.py)
  if (key === 'py' || key === 'python') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Python">
        <path
          d="M15.9 4C11.2 4 11.5 6.0 11.5 6.0L11.52 8.1H16.0V8.8H9.2C9.2 8.8 6 8.4 6 13.1C6 17.8 8.8 17.6 8.8 17.6H10.7V15.3C10.7 15.3 10.6 12.5 13.4 12.5H17.8C17.8 12.5 20.3 12.5 20.3 10.0V6.2C20.3 6.2 20.6 4 15.9 4ZM13.5 5.4C13.95 5.4 14.3 5.75 14.3 6.2C14.3 6.65 13.95 7.0 13.5 7.0C13.05 7.0 12.7 6.65 12.7 6.2C12.7 5.75 13.05 5.4 13.5 5.4Z"
          fill="#3776AB"
        />
        <path
          d="M16.1 28C20.8 28 20.5 26.0 20.5 26.0L20.48 23.9H16.0V23.2H22.8C22.8 23.2 26 23.6 26 18.9C26 14.2 23.2 14.4 23.2 14.4H21.3V16.7C21.3 16.7 21.4 19.5 18.6 19.5H14.2C14.2 19.5 11.7 19.5 11.7 22.0V25.8C11.7 25.8 11.4 28 16.1 28ZM18.5 26.6C18.05 26.6 17.7 26.25 17.7 25.8C17.7 25.35 18.05 25.0 18.5 25.0C18.95 25.0 19.3 25.35 19.3 25.8C19.3 26.25 18.95 26.6 18.5 26.6Z"
          fill="#FFD43B"
        />
      </svg>
    );
  }

  // JavaScript (.js / .jsx)
  if (key === 'js' || key === 'javascript' || key === 'jsx') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="JavaScript">
        <rect x="4" y="4" width="24" height="24" rx="5" fill="#F7DF1E" />
        <text x="16" y="21.5" textAnchor="middle" fontSize="11.5" fontWeight="900" fontFamily="system-ui, sans-serif" fill="#111827">
          JS
        </text>
      </svg>
    );
  }

  // TypeScript (.ts / .tsx)
  if (key === 'ts' || key === 'typescript' || key === 'tsx') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="TypeScript">
        <rect x="4" y="4" width="24" height="24" rx="5" fill="#3178C6" />
        <text x="16" y="21.5" textAnchor="middle" fontSize="11.5" fontWeight="900" fontFamily="system-ui, sans-serif" fill="#FFFFFF">
          TS
        </text>
      </svg>
    );
  }

  // HTML (.html / .htm)
  if (key === 'html' || key === 'htm') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="HTML">
        <path d="M6 4H26L24.2 24.4L16 27L7.8 24.4L6 4Z" fill="#E34F26" />
        <path d="M16 6V25.2L22.5 23.2L24 6H16Z" fill="#EF652A" />
        <path d="M10.5 10H21.5L21.2 13H13.4L13.7 16H20.9L20.3 22L16 23.3L11.7 22L11.4 18.5H14.1L14.3 20.1L16 20.6L17.7 20.1L17.9 18H11.1L10.5 10Z" fill="#FFFFFF" />
      </svg>
    );
  }

  // CSS (.css / .scss)
  if (key === 'css' || key === 'scss') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="CSS">
        <path d="M6 4H26L24.2 24.4L16 27L7.8 24.4L6 4Z" fill="#1572B6" />
        <path d="M16 6V25.2L22.5 23.2L24 6H16Z" fill="#33A9DC" />
        <path d="M10.5 10H21.5L21.1 13H13.6L13.8 15.8H20.8L20.2 22L16 23.3L11.8 22L11.5 18.5H14.2L14.3 20.1L16 20.6L17.7 20.1L17.9 18H11.2L10.5 10Z" fill="#FFFFFF" />
      </svg>
    );
  }

  // JSON (.json)
  if (key === 'json') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="JSON">
        <rect x="4" y="4" width="24" height="24" rx="5" fill="#F59E0B" />
        <text x="16" y="20.5" textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="monospace" fill="#111827">
          {'{}'}
        </text>
      </svg>
    );
  }

  // SVG image
  if (key === 'svg') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="SVG">
        <rect x="4" y="4" width="24" height="24" rx="5" fill="#EC4899" />
        <circle cx="11.5" cy="11.5" r="2.2" fill="#FFFFFF" />
        <path d="M8.5 22L13.5 15.5L17.2 19.5L20 16.2L23.5 22H8.5Z" fill="#FFFFFF" />
      </svg>
    );
  }

  // Shell / Terminal (.sh / bash)
  if (key === 'sh' || key === 'bash' || key === 'zsh') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Shell">
        <rect x="4" y="5" width="24" height="22" rx="4.5" fill="#10B981" />
        <path d="M9.5 12L14 16L9.5 20" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 20H22" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  // Default Code / Text File SVG
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="File">
      <path d="M7 4C5.895 4 5 4.895 5 6V26C5 27.105 5.895 28 7 28H25C26.105 28 27 27.105 27 26V11L20 4H7Z" fill="#3B82F6" />
      <path d="M20 4V10C20 10.552 20.448 11 21 11H27L20 4Z" fill="#93C5FD" />
      <path d="M12.5 16L9.5 19L12.5 22M19.5 16L22.5 19L19.5 22M17 15L15 23" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
