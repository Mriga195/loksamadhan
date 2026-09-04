import React from 'react';
import StatusPill from './StatusPill';

const DuplicatePanel = ({
  duplicates = [],
  isSearching = false,
  dismissedIds = new Set(),
  onSupportIssue,
  onReportAsNew,
}) => {
  const visibleDuplicates = duplicates.filter(
    (item) => !dismissedIds.has(item._id)
  );

  if (!isSearching && visibleDuplicates.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-4 shadow-sm transition-all">
      {isSearching && visibleDuplicates.length === 0 && (
        <div className="flex items-center space-x-2 text-amber-700 text-sm py-1">
          <svg
            className="animate-spin h-4 w-4 text-amber-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="font-medium">Checking for similar reports…</span>
        </div>
      )}

      {visibleDuplicates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-900">
              {visibleDuplicates.length}{' '}
              {visibleDuplicates.length === 1 ? 'person' : 'people'} may have already reported this
            </h3>
            {isSearching && (
              <span className="text-xs text-amber-600 animate-pulse">Updating...</span>
            )}
          </div>

          <p className="text-xs text-amber-700">
            Check below to see if your issue matches an existing report. Supporting an existing issue speeds up resolution!
          </p>

          <div className="space-y-3 mt-2">
            {visibleDuplicates.map((issue) => {
              const firstDescLine = issue.description
                ? issue.description.split('\n')[0].slice(0, 120)
                : '';

              return (
                <div
                  key={issue._id}
                  className="bg-white border border-amber-200 rounded-lg p-3 shadow-sm hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    {issue.photos && issue.photos.length > 0 ? (
                      <img
                        src={issue.photos[0]}
                        alt={issue.title}
                        className="h-16 w-16 object-cover rounded-md flex-shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                        No image
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {issue.title}
                        </h4>
                        <StatusPill status={issue.status} className="ml-2 flex-shrink-0" />
                      </div>

                      {firstDescLine && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                          {firstDescLine}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1.5">
                        <span className="font-medium text-amber-800">
                          {issue.distance != null ? `${issue.distance} m away` : 'Nearby'} &middot; same category
                        </span>
                        <span>
                          {issue.supporterCount || 0}{' '}
                          {issue.supporterCount === 1 ? 'supporter' : 'supporters'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => onReportAsNew && onReportAsNew(issue._id)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Report as new
                    </button>
                    <button
                      type="button"
                      onClick={() => onSupportIssue && onSupportIssue(issue)}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center space-x-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h47m0 0l-7-7m7 7l-7 7" />
                      </svg>
                      <span>This is my issue</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicatePanel;