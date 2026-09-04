import React, { useState, useEffect } from 'react';

const PhotoInput = ({ onPhotosChange }) => {
  const [photos, setPhotos] = useState([]); // Array of File objects
  const [previews, setPreviews] = useState([]); // Array of Object URLs
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    if (photos.length + selectedFiles.length > 3) {
      setError('Maximum 3 photos allowed');
      e.target.value = '';
      return;
    }

    const validFiles = [];
    const newPreviews = [...previews];

    for (const file of selectedFiles) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Only JPEG, PNG, and WebP images are allowed');
        e.target.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Each photo must be 5MB or smaller');
        e.target.value = '';
        return;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    const updatedPhotos = [...photos, ...validFiles];
    setPhotos(updatedPhotos);
    setPreviews(newPreviews);
    e.target.value = '';

    if (onPhotosChange) {
      onPhotosChange(updatedPhotos);
    }
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(previews[index]);
    const updatedPhotos = photos.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    setPhotos(updatedPhotos);
    setPreviews(updatedPreviews);

    if (onPhotosChange) {
      onPhotosChange(updatedPhotos);
    }
  };

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Photos (optional, up to 3 photos, max 5MB each)
      </label>

      {error && (
        <p className="text-red-500 text-xs font-medium">{error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {previews.map((url, index) => (
          <div key={index} className="relative h-24 w-24">
            <img
              src={url}
              alt={`Preview ${index + 1}`}
              className="h-24 w-24 object-cover rounded-lg border border-gray-200 shadow-sm"
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow hover:bg-red-600 focus:outline-none"
              aria-label={`Remove photo ${index + 1}`}
            >
              &times;
            </button>
          </div>
        ))}

        {photos.length < 3 && (
          <label
            htmlFor="photo-input"
            className="flex flex-col items-center justify-center h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <input
              id="photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-xs text-gray-500 mt-1">Add Photo</span>
          </label>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {photos.length}/3 photos selected
      </p>
    </div>
  );
};

export default PhotoInput;