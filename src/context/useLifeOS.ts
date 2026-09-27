import { useContext } from 'react';
import { LifeOSContext } from './LifeOSContext';

export const useLifeOS = () => {
  const context = useContext(LifeOSContext);
  if (!context) {
    throw new Error('useLifeOS must be used within a LifeOSProvider');
  }
  return context;
};