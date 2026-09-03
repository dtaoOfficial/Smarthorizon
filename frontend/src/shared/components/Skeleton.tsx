import React from 'react';

export const SkeletonText: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`bg-[#BFD4E8]/60 rounded animate-pulse ${className}`} />
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = 'h-32 w-full' }) => (
  <div className={`bg-[#DCEEFF] border border-[#BFD4E8] rounded-2xl p-4 animate-pulse space-y-3 ${className}`}>
    <div className="h-4 w-1/3 bg-[#BFD4E8] rounded" />
    <div className="h-8 w-1/2 bg-[#BFD4E8]/80 rounded" />
    <div className="h-3 w-2/3 bg-[#BFD4E8]/60 rounded" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full bg-[#DCEEFF] border border-[#BFD4E8] rounded-2xl overflow-hidden p-4 space-y-4 animate-pulse">
    <div className="h-6 w-full bg-[#BFD4E8] rounded" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 py-2 border-b border-[#BFD4E8]">
        <div className="h-4 w-1/6 bg-[#BFD4E8]/60 rounded" />
        <div className="h-4 w-2/6 bg-[#BFD4E8]/40 rounded" />
        <div className="h-4 w-2/6 bg-[#BFD4E8]/40 rounded" />
        <div className="h-4 w-1/6 bg-[#BFD4E8]/60 rounded" />
      </div>
    ))}
  </div>
);
