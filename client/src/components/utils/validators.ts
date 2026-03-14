// Client-side form validation utilities for email, name, password, and terms
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

// Update validatePassword function in validators.ts
export const validatePassword = (password: string): { isValid: boolean; error?: string; strength?: number } => {
  if (!password) {
    return { isValid: false, error: 'Password is required', strength: 0 };
  }
  
  // Check all requirements
  const requirements = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];
  
  const metRequirements = requirements.filter(Boolean).length;
  const strength = metRequirements;
  
  // At least 4 out of 5 requirements must be met
  if (metRequirements < 4) {
    const missing = [];
    if (!requirements[0]) missing.push('8 characters');
    if (!requirements[1]) missing.push('uppercase letter');
    if (!requirements[2]) missing.push('lowercase letter');
    if (!requirements[3]) missing.push('number');
    if (!requirements[4]) missing.push('special character');
    
    return { 
      isValid: false, 
      error: `Password needs: ${missing.join(', ')}`, 
      strength 
    };
  }
  
  return { isValid: true, strength };
};

export const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (!name.trim()) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (name.length > 50) {
    return { isValid: false, error: 'Name is too long' };
  }
  
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return { isValid: false, error: 'Name can only contain letters and spaces' };
  }
  
  return { isValid: true };
};

export const validateConfirmPassword = (password: string, confirmPassword: string): { isValid: boolean; error?: string } => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  
  return { isValid: true };
};

export const validateTerms = (accepted: boolean): { isValid: boolean; error?: string } => {
  if (!accepted) {
    return { isValid: false, error: 'You must accept the terms and conditions' };
  }
  
  return { isValid: true };
};