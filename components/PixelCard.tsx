
import React from 'react';

interface PixelCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  bg?: string;
}

export const PixelCard: React.FC<PixelCardProps> = ({ children, title, className = "", bg = "bg-[#4a4a4a]" }) => {
  return (
    <div className={`pixel-border p-3 md:p-5 ${bg} ${className}`}>
      {title && (
        <div className="mb-4 md:mb-6 text-yellow-400 border-b-4 border-black pb-2 md:pb-3 text-[12px] md:text-[16px] uppercase tracking-wider text-center font-bold">
          {title}
        </div>
      )}
      {children}
    </div>
  );
};
