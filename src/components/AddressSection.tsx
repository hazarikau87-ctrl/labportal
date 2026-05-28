import React, { useState, useEffect } from 'react';

// Define the data structure this component will output
export interface AddressData {
  bookingType: 'walk-in' | 'home';
  addressLine: string;
  pincode: string;
  landmark: string;
}

interface AddressSectionProps {
  onChange: (data: AddressData) => void;
}

export const AddressSection: React.FC<AddressSectionProps> = ({ onChange }) => {
  // State to handle layout visibility toggle
  const [bookingType, setBookingType] = useState<'walk-in' | 'home'>('walk-in');
  
  // States for the form fields
  const [addressLine, setAddressLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');

  // Automatically bubble data up to the parent component whenever any value changes
  useEffect(() => {
    onChange({
      bookingType,
      // Clear fields if walk-in is selected so clean data goes to Supabase
      addressLine: bookingType === 'home' ? addressLine : '',
      pincode: bookingType === 'home' ? pincode : '',
      landmark: bookingType === 'home' ? landmark : '',
    });
  }, [bookingType, addressLine, pincode, landmark, onChange]);

  return (
    <div className="w-full max-w-md mx-auto my-4 space-y-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Selection Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How would you like to give your sample?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label 
            className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer text-sm font-medium transition-all ${
              bookingType === 'walk-in' 
                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            <input
              type="radio"
              name="bookingType"
              value="walk-in"
              checked={bookingType === 'walk-in'}
              onChange={() => setBookingType('walk-in')}
              className="sr-only" // Hidden visually, semantic for screen readers
            />
            Visit the Lab
          </label>

          <label 
            className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer text-sm font-medium transition-all ${
              bookingType === 'home' 
                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            <input
              type="radio"
              name="bookingType"
              value="home"
              checked={bookingType === 'home'}
              onChange={() => setBookingType('home')}
              className="sr-only"
            />
            Home Collection
          </label>
        </div>
      </div>

      {/* Conditional Address Section */}
      {bookingType === 'home' && (
        <div className="pt-2 border-t border-gray-100 space-y-3 animate-fadeIn">
          <h3 className="text-sm font-semibold text-gray-800">Home Collection Address</h3>
          
          <div>
            <label htmlFor="addressLine" className="block text-xs font-medium text-gray-500 mb-1">
              Flat/House No., Building, Street *
            </label>
            <input
              type="text"
              id="addressLine"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              required={bookingType === 'home'}
              placeholder="e.g., Flat 402, Royal Enclave"
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pincode" className="block text-xs font-medium text-gray-500 mb-1">
                Pincode *
              </label>
              <input
                type="text"
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                required={bookingType === 'home'}
                maxLength={6}
                placeholder="6-digit PIN"
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="landmark" className="block text-xs font-medium text-gray-500 mb-1">
                Landmark (Optional)
              </label>
              <input
                type="text"
                id="landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g., Near Metro Station"
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
