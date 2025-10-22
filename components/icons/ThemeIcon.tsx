import React from 'react';

export const ThemeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v.01l-.001.001-.001.001a6 6 0 0 1-5.84-7.38m5.85-7.38a6 6 0 0 0-5.84 7.38m5.84-7.38a6 6 0 0 1 5.84 7.38m0-7.38L15.59 7" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
  </svg>
);