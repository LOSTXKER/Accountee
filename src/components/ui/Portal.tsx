// src/components/ui/Portal.tsx
"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

const Portal = ({ children }: PortalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    console.error("The modal-root element is missing in your HTML.");
    return null;
  }

  return createPortal(children, modalRoot);
};

export default Portal;