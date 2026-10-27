import React from 'react';

export default function PdfViewer({ url, name }) {
  return (
    <div className="w-full h-full bg-slate-800 relative">
      <iframe
        src={url}
        title={name || "PDF Document"}
        className="w-full h-full border-none"
      />
    </div>
  );
}
