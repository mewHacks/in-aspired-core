// Password strength meter with color-coded progress bar
import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react';
import { PasswordRequirements } from './PasswordRequirements';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ 
  password, 
  showRequirements = true 
}) => {
  // Calculate strength
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const strengthIcons = [ShieldOff, ShieldAlert, Shield, Shield, ShieldCheck];
  const StrengthIcon = strengthIcons[strength] || ShieldOff;
  
  return (
    <div className="space-y-4">
      {/* Strength Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Password strength</span>
          <div className="flex items-center gap-2">
            <StrengthIcon className={`h-4 w-4 ${
              strength === 0 ? 'text-red-500' :
              strength === 1 ? 'text-orange-500' :
              strength === 2 ? 'text-yellow-500' :
              strength === 3 ? 'text-blue-500' :
              'text-green-500'
            }`} />
            <span className={`text-sm font-semibold ${
              strength === 0 ? 'text-red-600' :
              strength === 1 ? 'text-orange-600' :
              strength === 2 ? 'text-yellow-600' :
              strength === 3 ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {strengthLabels[strength]}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                index < strength ? strengthColors[strength] : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Requirements Checklist (only show when typing) */}
      {showRequirements && password.length > 0 && (
        <PasswordRequirements password={password} />
      )}
      
      {/* Tips for empty password */}
      {password.length === 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Create a strong password:</strong> Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols.
          </p>
        </div>
      )}
    </div>
  );
};