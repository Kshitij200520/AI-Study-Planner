import { useContext } from 'react';
import { AuthContext } from './AuthState';

export const useAuth = () => useContext(AuthContext);