import { useContext } from 'react';
import { ToastContext } from './ToastState';

export const useToast = () => useContext(ToastContext);