// Password requirements checklist showing validation rules with visual indicators
import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const requirements = [
    {
      label: 'At least 8 characters',
      isValid: password.length >= 8,
      key: 'length'
    },
    {
      label: 'At least one uppercase letter',
      isValid: /[A-Z]/.test(password),
      key: 'uppercase'
    },
    {
      label: 'At least one lowercase letter',
      isValid: /[a-z]/.test(password),
      key: 'lowercase'
    },
    {
      label: 'At least one number',
      isValid: /[0-9]/.test(password),
      key: 'number'
    },
    {
      label: 'At least one special character',
      isValid: /[^A-Za-z0-9]/.test(password),
      key: 'special'
    }
  ];

  const metRequirements = requirements.filter(req => req.isValid).length;
  const totalRequirements = requirements.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Password requirements</span>
        <span className="text-sm font-semibold text-primary-600">
          {metRequirements}/{totalRequirements} met
        </span>
      </div>
      
      <div className="space-y-2">
        {requirements.map((req) => (
          <div key={req.key} className="flex items-center gap-2">
            {req.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : password.length > 0 ? (
              <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
            )}
            <span className={`text-sm ${
              req.isValid ? 'text-green-600' : 
              password.length > 0 ? 'text-red-500' : 
              'text-gray-500'
            }`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
      
      {password.length > 0 && metRequirements < totalRequirements && (
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Tip:</strong> Try adding {requirements.filter(req => !req.isValid).map(req => {
              if (req.key === 'uppercase') return 'an uppercase letter';
              if (req.key === 'lowercase') return 'a lowercase letter';
              if (req.key === 'number') return 'a number';
              if (req.key === 'special') return 'a symbol (!@#$%^&*)';
              return '';
            }).filter(Boolean).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};