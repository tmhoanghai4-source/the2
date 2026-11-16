import React from 'react';

export type BrandFileType = 'pptx' | 'docx' | 'pdf' | 'zip' | 'code';

interface FileBrandIconProps {
  type: BrandFileType;
  size?: number;
  className?: string;
}

export const FileBrandIcon: React.FC<FileBrandIconProps> = ({ type, size = 40, className = '' }) => {
  if (type === 'pptx') {
    // Authentic PowerPoint-style SVG mark
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="PowerPoint"
      >
        <circle cx="27" cy="24" r="16" fill="#C43E1C" />
        <path d="M27 8C35.8366 8 43 15.1634 43 24H27V8Z" fill="#FF8F6B" />
        <path d="M27 24H43C43 32.8366 35.8366 40 27 40V24Z" fill="#ED6C47" />
        <rect x="4" y="13" width="22" height="22" rx="4" fill="#D24726" />
        <path
          d="M11.5 30V18H16.2C18.7 18 20.3 19.4 20.3 21.8C20.3 24.2 18.7 25.6 16.2 25.6H14.1V30H11.5ZM14.1 23.4H15.9C17.1 23.4 17.7 22.8 17.7 21.8C17.7 20.8 17.1 20.2 15.9 20.2H14.1V23.4Z"
          fill="white"
        />
      </svg>
    );
  }

  if (type === 'docx') {
    // Authentic Word-style SVG mark
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Word Document"
      >
        <rect x="14" y="8" width="28" height="32" rx="3" fill="#41A5EE" />
        <rect x="14" y="16" width="28" height="8" fill="#2B7CD3" />
        <rect x="14" y="24" width="28" height="8" fill="#185ABD" />
        <path d="M14 32H42V37C42 38.6569 40.6569 40 39 40H17C15.3431 40 14 38.6569 14 37V32Z" fill="#103F91" />
        <rect x="4" y="13" width="22" height="22" rx="4" fill="#185ABD" />
        <path
          d="M8.8 18.2H11.3L12.8 25.8L14.6 18.2H16.8L18.6 25.8L20.1 18.2H22.5L19.8 30H17.4L15.7 22.8L14 30H11.6L8.8 18.2Z"
          fill="white"
        />
      </svg>
    );
  }

  if (type === 'pdf') {
    // Clean PDF SVG mark
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="PDF Document"
      >
        <path d="M10 6C10 4.89543 10.8954 4 12 4H30L40 14V42C40 43.1046 39.1046 44 38 44H12C10.8954 44 10 43.1046 10 42V6Z" fill="#EF4444" />
        <path d="M30 4L40 14H32C30.8954 14 30 13.1046 30 12V4Z" fill="#FCA5A5" />
        <rect x="6" y="22" width="26" height="12" rx="2.5" fill="#991B1B" />
        <text x="19" y="31" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="800" fontFamily="system-ui, sans-serif">
          PDF
        </text>
      </svg>
    );
  }

  if (type === 'zip') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="ZIP Archive"
      >
        <path d="M6 12C6 9.79086 7.79086 8 10 8H19L23 13H38C40.2091 13 42 14.7909 42 17V36C42 38.2091 40.2091 40 38 40H10C7.79086 40 6 38.2091 6 36V12Z" fill="#4F46E5" />
        <rect x="21" y="13" width="6" height="27" fill="#312E81" />
        <rect x="22" y="16" width="2" height="2" fill="#E0E7FF" />
        <rect x="24" y="19" width="2" height="2" fill="#E0E7FF" />
        <rect x="22" y="22" width="2" height="2" fill="#E0E7FF" />
        <rect x="24" y="25" width="2" height="2" fill="#E0E7FF" />
        <rect x="21.5" y="29" width="5" height="6" rx="1.5" fill="#A5B4FC" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="File"
    >
      <path d="M10 6C10 4.89543 10.8954 4 12 4H30L40 14V42C40 43.1046 39.1046 44 38 44H12C10.8954 44 10 43.1046 10 42V6Z" fill="#334155" />
      <path d="M30 4L40 14H32C30.8954 14 30 13.1046 30 12V4Z" fill="#64748B" />
      <path d="M20 23L15 27L20 31M28 23L33 27L28 31" stroke="#60A5FA" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default FileBrandIcon;
