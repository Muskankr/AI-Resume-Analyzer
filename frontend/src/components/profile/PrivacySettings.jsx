import React, { useState } from 'react';

export default function PrivacySettings({ initialProfile }) {
  const [isPublic, setIsPublic] = useState(initialProfile?.isPubliclyVisible || false);
  const [slug, setSlug] = useState(initialProfile?.publicSlug || '');

  const handleTogglePrivacy = async () => {
    const nextState = !isPublic;
    setIsPublic(nextState);

    try {
      const response = await fetch('/api/profile/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: nextState, customSlug: slug })
      });
      const data = await response.json();
      if (data.profile) setSlug(data.profile.publicSlug);
    } catch (err) {
      console.error('Failed to sync privacy preferences:', err);
    }
  };

  const shareableUrl = `${window.location.origin}/p/${slug}`;

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-white max-w-md">
      <h3 className="text-md font-bold mb-2">Public Profile Visibility</h3>
      <p className="text-xs text-slate-400 mb-4">Share your exam scores, improvement milestones, and bio page with recruiters or peers publicly.</p>

      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium">Make Profile Public</span>
        <button
          onClick={handleTogglePrivacy}
          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${isPublic ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {isPublic && slug && (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
          <p className="text-slate-500 mb-1">Your Shareable Public Link:</p>
          <div className="flex items-center justify-between">
            <span className="text-blue-400 truncate mr-2">{shareableUrl}</span>
            <button 
              onClick={() => navigator.clipboard.writeText(shareableUrl)}
              className="px-2 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
