// frontend/src/components/ProductVideo.js
import React from 'react';

export default function ProductVideo({ videoUrl = '', width = 300, height = 170 }) {
  if (!videoUrl) return null;

  const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);
  const isVimeo = /vimeo\.com/.test(videoUrl);

  if (isYouTube) {
    // convert watch?v= to embed if present
    let embed = videoUrl;
    if (videoUrl.includes('watch?v=')) embed = videoUrl.replace('watch?v=', 'embed/');
    // handle youtu.be short links
    if (videoUrl.includes('youtu.be/')) embed = videoUrl.replace('youtu.be/', 'www.youtube.com/embed/');
    return (
      <div style={{ width, height, overflow: 'hidden', borderRadius: 8, border: '1px solid #eee' }}>
        <iframe
          title="Product video"
          src={embed}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isVimeo) {
    // vimeo -> iframe embed
    const embed = videoUrl.includes('/video/') ? videoUrl : videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/');
    return (
      <div style={{ width, height, overflow: 'hidden', borderRadius: 8, border: '1px solid #eee' }}>
        <iframe
          title="Product video"
          src={embed}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // default: direct mp4 or webm file
  return (
    <div style={{ width, height, borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
      <video
        width="100%"
        height="100%"
        controls
        preload="metadata"
        style={{ display: 'block', objectFit: 'cover' }}
      >
        <source src={videoUrl} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
