import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { SourceText } from '../types';
import { ZoomIn, ZoomOut, Type, Highlighter, Layers, X } from 'lucide-react';

interface SourcePanelProps {
  sources: SourceText[];
  isOpen: boolean;
  onToggle: () => void;
}

const SourcePanel: React.FC<SourcePanelProps> = ({ sources = [], isOpen, onToggle }) => {
  const [activeTab, setActiveTab] = useState<string>(sources?.[0]?.id || 'A');
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Reset active tab if sources change
  useEffect(() => {
    if (sources && sources.length > 0) {
      setActiveTab(sources[0].id);
    }
  }, [sources]);

  const activeSource = sources?.find(s => s.id === activeTab) || sources?.[0];

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-y-0 left-0 z-40 w-full md:w-1/2 lg:w-[45%] bg-white shadow-2xl transform transition-transform duration-300 flex flex-col border-r border-gray-200 ${highContrast ? 'bg-gray-900 text-yellow-50' : ''}`}>

      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${highContrast ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-edexcel-light'}`}>
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className="md:hidden p-1 text-gray-600 hover:bg-black/10 rounded-full">
            <X size={20} />
          </button>
          <h2 className="font-bold text-lg text-edexcel-dark flex items-center gap-2">
            <Layers size={20} />
            <span>SOURCE BOOKLET</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setFontSize(f => Math.max(12, f - 2))} className="p-1 hover:bg-black/10 rounded" title="Decrease Font">
            <ZoomOut size={18} />
          </button>
          <button onClick={() => setFontSize(f => Math.min(24, f + 2))} className="p-1 hover:bg-black/10 rounded" title="Increase Font">
            <ZoomIn size={18} />
          </button>
          <button onClick={() => setLineHeight(l => l >= 2.2 ? 1.6 : 2.2)} className="p-1 hover:bg-black/10 rounded" title="Toggle Line Height">
            <Type size={18} />
          </button>
          <button onClick={() => setHighContrast(!highContrast)} className={`p-1 rounded ${highContrast ? 'bg-yellow-400 text-black' : 'hover:bg-black/10'}`} title="High Contrast">
            <Highlighter size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      {sources && sources.length > 1 && (
        <div className="flex border-b border-gray-200">
          {sources.map(source => (
            <button
              key={source.id}
              onClick={() => setActiveTab(source.id)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === source.id
                ? 'border-edexcel-blue text-edexcel-blue bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } ${highContrast ? 'bg-gray-800 border-gray-700 text-gray-300' : ''}`}
            >
              Source {source.id}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 source-scroll">
        {activeSource ? (
          <article
            className={`max-w-2xl mx-auto ${highContrast ? '' : ''}`}
            style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
          >
            <div className={`mb-8 p-4 rounded-lg text-sm italic border-l-4 no-print ${highContrast ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-400 text-gray-700'}`}>
              <strong className={`block not-italic mb-1 text-lg ${highContrast ? 'text-white' : 'text-gray-900'}`}>{activeSource.title || `Source ${activeSource.id}`}</strong>
              <div className="text-base font-serif mb-2">{activeSource.author && `By ${activeSource.author}`} {activeSource.year && `(${activeSource.year})`}</div>
              <p className={`mt-2 ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>{activeSource.summary}</p>
            </div>

            <div className="font-serif select-text relative" style={{ textAlign: 'justify', textJustify: 'inter-word' }}>
              {activeSource.content.split('\n').filter(p => p.trim() !== '').map((para, i) => {
                return (
                  <div key={i} className="mb-5">
                    <p className="mb-0">{para}</p>
                  </div>
                );
              })}
            </div>
          </article>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {sources.length === 0 ? "Sources are generating..." : "No active source selected."}
          </div>
        )}
      </div>
    </div>
  );
};

export default SourcePanel;