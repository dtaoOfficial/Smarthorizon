import React from 'react';
import { Inbox } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#181818] border border-[#2B2B2B] rounded-2xl space-y-4 my-4 select-none text-[#FFFFFF]">
      <div className="w-16 h-16 rounded-2xl bg-[#0E0E0E] border border-[#2B2B2B] flex items-center justify-center text-[#FFFFFF]">
        {icon || <Inbox className="w-8 h-8 text-[#FFFFFF]" />}
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-lg font-bold font-outfit text-[#FFFFFF]">{title}</h3>
        <p className="text-xs text-[#B3B3B3] font-sans leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <AnimatedButton onClick={onAction} variant="primary" size="sm" className="mt-2 bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]">
          {actionLabel}
        </AnimatedButton>
      )}
    </div>
  );
};
