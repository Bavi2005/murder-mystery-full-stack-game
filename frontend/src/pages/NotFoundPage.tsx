import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <div className="min-h-[70vh] flex items-center justify-center px-4">
    <div className="text-center">
      <p className="font-cinzel text-8xl font-bold text-gradient mb-2">404</p>
      <h1 className="font-cinzel text-2xl text-mystery-100 mb-2">Page Not Found</h1>
      <p className="text-mystery-400 mb-6">The room you are looking for has been sealed off.</p>
      <Link to="/lobby" className="btn-gold">Return to the Lobby</Link>
    </div>
  </div>
);

export default NotFoundPage;
