import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

type DutyType = string;

interface DutyBadgeProps {
  type: DutyType;
  className?: string;
}

const dutyColors: Record<string, string> = {
  'OPD': 'duty-opd',
  'OT': 'duty-ot',
  'Night Duty': 'duty-night',
  'Ward': 'duty-ward',
  'Camp': 'duty-camp',
  'Emergency': 'bg-red-500/20 text-red-700 border border-red-200',
  'Cataract OT': 'bg-blue-500/20 text-blue-700 border border-blue-200',
  'Retina OT': 'bg-purple-500/20 text-purple-700 border border-purple-200',
  'Glaucoma OT': 'bg-teal-500/20 text-teal-700 border border-teal-200',
  'Cornea OT': 'bg-indigo-500/20 text-indigo-700 border border-indigo-200',
  'Today Doctor': 'bg-amber-500/20 text-amber-700 border border-amber-200',
};

export const DutyBadge: React.FC<DutyBadgeProps> = ({ type, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-tiny font-medium',
        dutyColors[type] || 'bg-muted text-muted-foreground',
        className
      )}
    >
      {type}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'Pending' | 'Approved' | 'Rejected';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const statusClasses = {
    Pending: 'status-pending',
    Approved: 'status-approved',
    Rejected: 'status-rejected',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-tiny font-medium',
        statusClasses[status],
        className
      )}
    >
      {status}
    </span>
  );
};

interface PhoneButtonProps {
  phone: string;
  size?: 'sm' | 'md';
}

export const PhoneButton: React.FC<PhoneButtonProps> = ({ phone, size = 'md' }) => {
  const handleCall = () => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  };

  return (
    <button
      onClick={handleCall}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors',
        size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
      )}
      aria-label={`Call ${phone}`}
    >
      <Phone className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
    </button>
  );
};

interface DoctorAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DoctorAvatar: React.FC<DoctorAvatarProps> = ({ name, size = 'md', className }) => {
  const initials = name
    .split(' ')
    .filter((part) => part.startsWith('Dr.') === false)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'w-8 h-8 text-tiny',
    md: 'w-10 h-10 text-caption',
    lg: 'w-14 h-14 text-body',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
};
