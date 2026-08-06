import React from 'react';

const TermsPage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="font-cinzel text-3xl font-bold text-gradient mb-6">Terms of Service</h1>
    <div className="text-mystery-300 space-y-4 text-sm leading-relaxed">
      <p>
        By using Mystery Mansion you agree to play fairly and respect other
        players. Do not attempt to exploit, cheat, or disrupt the service.
      </p>
      <p>
        All gameplay is governed by the server. The server is the sole authority
        for dice rolls, card dealing, and the solution envelope; client input is
        validated and sanitized at every boundary.
      </p>
      <p>
        This project is provided as-is for educational purposes. We are not
        liable for any damage arising from its use.
      </p>
    </div>
  </div>
);

export default TermsPage;
