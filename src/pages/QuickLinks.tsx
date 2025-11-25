// Alvaro-quicklinks: New page component for Quick Links feature
import React, { useState } from 'react';
import { Link, ExternalLink, Trash2 } from 'lucide-react';

interface QuickLink {
  id: string;
  label: string;
  url: string;
}

export function QuickLinks() {
  // Alvaro-quicklinks: State management for links and form inputs
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [labelInput, setLabelInput] = useState('');
  const [urlInput, setUrlInput] = useState('');

  // Alvaro-quicklinks: Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedLabel = labelInput.trim();
    const trimmedUrl = urlInput.trim();

    // Alvaro-quicklinks: Validation - ignore if either field is empty
    if (!trimmedLabel || !trimmedUrl) {
      return;
    }

    // Alvaro-quicklinks: URL normalization - prepend https:// if no protocol
    let normalizedUrl = trimmedUrl;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Alvaro-quicklinks: Create new link and add to state
    const newLink: QuickLink = {
      id: Date.now().toString(),
      label: trimmedLabel,
      url: normalizedUrl,
    };

    setLinks((prev) => [...prev, newLink]);

    // Alvaro-quicklinks: Clear inputs after successful add
    setLabelInput('');
    setUrlInput('');
  };

  // Alvaro-quicklinks: Delete link handler
  const handleDelete = (id: string) => {
    setLinks((prev) => prev.filter((link) => link.id !== id));
  };

  // Alvaro-quicklinks: Open link in new tab
  const handleOpen = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Alvaro-quicklinks: Check if form is valid for submit button
  const isFormValid = labelInput.trim() && urlInput.trim();

  return (
    <div className="h-screen overflow-y-auto pb-20 sm:pb-24 bg-gray-50 dark:bg-gray-900">
      {/* Alvaro-quicklinks: Header section */}
      <header className="bg-white dark:bg-gray-800 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Links</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Save important websites for one-tap access
            </p>
          </div>
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Link className="w-5 h-5 text-blue-600 dark:text-blue-300" />
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6">
        {/* Alvaro-quicklinks: List section - moved to top */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Saved Links</h2>

          {/* Alvaro-quicklinks: Empty state */}
          {links.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
              <Link className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No quick links yet
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Add your first link using the form below
              </p>
            </div>
          ) : (
            // Alvaro-quicklinks: Links list
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">
                        {link.label}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {link.url}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleOpen(link.url)}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">Open</span>
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alvaro-quicklinks: Form section - moved to bottom */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add New Link</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name / description
              </label>
              <input
                id="label"
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="e.g., Gmail, Work Calendar, Recipes"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website URL
              </label>
              <input
                id="url"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g., gmail.com or https://example.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base"
              />
            </div>

            <button
              type="submit"
              disabled={!isFormValid}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Add Link
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
