import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import MapPicker from '../components/MapPicker';
import PhotoInput from '../components/PhotoInput';
import DuplicatePanel from '../components/DuplicatePanel';

const CATEGORIES = ['Road', 'Water', 'Sanitation', 'Streetlight', 'Drainage', 'Other'];

const Report = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user } = useAuth();

  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null); // [lng, lat]
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]); // File[]
  const [duplicateOfId, setDuplicateOfId] = useState(null);

  const [duplicates, setDuplicates] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  // Check if returning from login after "This is my issue" action
  useEffect(() => {
    if (user && routeLocation.state?.pendingSupportId) {
      const supportId = routeLocation.state.pendingSupportId;
      api(`/issues/${supportId}/support`, { method: 'POST' })
        .then(() => {
          navigate(`/issue/${supportId}`, {
            state: { message: 'Support registered for existing report!' }
          });
        })
        .catch((err) => {
          setError(err.message || 'Failed to register support');
        });
    }
  }, [user, routeLocation.state]);

  // Debounced duplicate detection trigger (400ms)
  useEffect(() => {
    const lng = location ? location[0] : null;
    const lat = location ? location[1] : null;

    if (!category || lng == null || lat == null || title.trim().length < 5) {
      setDuplicates([]);
      setIsSearching(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          lng: String(lng),
          lat: String(lat),
          category: category,
          text: title.trim(),
        });

        const data = await api(`/issues/similar?${query.toString()}`, {
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          setDuplicates(data.items || []);
          setIsSearching(false);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching duplicate candidates:', err);
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [category, location, title]);

  const handleSupportIssue = async (issue) => {
    const issueId = typeof issue === 'string' ? issue : issue._id;

    if (!user) {
      // Stash pending state and redirect to login
      navigate('/login', {
        state: {
          from: '/report',
          pendingSupportId: issueId,
        },
      });
      return;
    }

    try {
      await api(`/issues/${issueId}/support`, { method: 'POST' });
      navigate(`/issue/${issueId}`, {
        state: { message: 'You have supported this issue!' },
      });
    } catch (err) {
      setError(err.message || 'Failed to support issue');
    }
  };

  const handleReportAsNew = (issueId) => {
    setDismissedIds((prev) => new Set(prev).add(issueId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError('Please select a category');
      return;
    }

    if (!location || location.length !== 2) {
      setError('Please select a location on the map');
      return;
    }

    if (!title.trim() || title.trim().length < 5) {
      setError('Title must be at least 5 characters');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      if (address.trim()) {
        formData.append('address', address.trim());
      }
      formData.append('lng', location[0]);
      formData.append('lat', location[1]);

      if (duplicateOfId) {
        formData.append('duplicateOf', duplicateOfId);
      }

      photos.forEach((file) => {
        formData.append('photos', file);
      });

      const res = await api('/issues', {
        method: 'POST',
        body: formData,
        isForm: true,
      });

      navigate(`/issue/${res._id || res.id}`, {
        state: { message: 'Issue reported successfully!' },
      });
    } catch (err) {
      setError(err.message || 'Failed to submit report');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report a Civic Issue</h1>
        <p className="text-sm text-gray-600 mt-1">
          Help us identify and fix problems in your community. Provide details and location below.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {/* 1. Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Select issue category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Map Picker + Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location & Address <span className="text-red-500">*</span>
          </label>
          <MapPicker onLocationChange={setLocation} />
          <div className="mt-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Landmark or street address (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* 3. Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Issue Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Large pothole near central bus stand"
            required
            minLength={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* 4. Duplicate Detection Panel (Appears above description) */}
        <DuplicatePanel
          duplicates={duplicates}
          isSearching={isSearching}
          dismissedIds={dismissedIds}
          onSupportIssue={handleSupportIssue}
          onReportAsNew={handleReportAsNew}
        />

        {/* 5. Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide details about the severity, exact spot, or any danger posed..."
            rows={4}
            required
            minLength={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* 6. Photos */}
        <PhotoInput onPhotosChange={setPhotos} />

        {/* 7. Submit Button */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm focus:outline-none disabled:opacity-50 flex items-center space-x-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Report</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Report;
