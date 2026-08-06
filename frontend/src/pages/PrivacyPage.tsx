import React from 'react';

const PrivacyPage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="font-cinzel text-3xl font-bold text-gradient mb-6">Privacy Policy</h1>
    <div className="prose prose-invert max-w-none text-mystery-300 space-y-4 text-sm leading-relaxed">
      <p>
        Mystery Mansion is a demonstration project built for the ft_transcendence
        curriculum. We collect only the information you provide during registration
        (email, username, password) and game data required to run the service.
      </p>
      <p>
        Passwords are hashed with bcrypt (12 rounds) before storage. Session
        refresh tokens are stored in httpOnly, SameSite cookies. Secrets of a
        game (the solution envelope) are encrypted at rest with AES-256-GCM and
        never transmitted to clients until a game concludes.
      </p>
      <p>
        We do not sell, rent, or share personal data with third parties, and we
        use no advertising trackers.
      </p>
    </div>
  </div>
);

export default PrivacyPage;
