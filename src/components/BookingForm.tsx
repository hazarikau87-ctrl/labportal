import { useState } from 'react';
import { User, Smartphone, Mail, Upload, Calendar, Clock, Info, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import TestSelector from './TestSelector';
import AddressSection from './AddressSection'; // Imported custom AddressSection component
import { getLocalDate } from '../lib/utils';

export default function BookingForm({
  formData,
  setFormData,
  errors,
  onSubmit,
  onNext,
  submitting,
  btnLabel,
  labSettings,
  slots,
  setShowRates,
  setShowTerms
}: BookingFormProps) {
  const [step, setStep] = useState(1);
  const [isSavingLead, setIsSavingLead] = useState(false);

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNextStep = async () => {
    // Basic validation before moving to step 2 - Including required address fields if universally required
    if (!formData.name || !formData.mobile || !formData.age || !formData.gender || !formData.addressLine || !formData.pincode) {
      alert("Please fill in all required patient information fields, including Address and Pincode.");
      return;
    }

    setIsSavingLead(true);
    try {
      await onNext(); 
      setStep(2);
    } catch (err) {
      console.error("Step 1 Lead capture failed", err);
      setStep(2); // Still move forward so user isn't stuck
    } finally {
      setIsSavingLead(false);
    }
  };

  // Fixed the key reference for timeSlot to match state
  const fieldCls = (key: string) => `w-full px-3 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none focus:bg-white transition-colors ${errors[key] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-600'}`;

  // Local handler to cleanly clean data fields depending on selection
  const handleBookingTypeChange = (type: 'walk-in' | 'home') => {
    setFormData({
      ...formData,
      bookingType: type,
      addressLine: type === 'home' ? formData.addressLine : '',
      pincode: type === 'home' ? formData.pincode : '',
      landmark: type === 'home' ? formData.landmark : ''
    });
  };

  return (
    <form 
      onSubmit={(e) => {
        console.log("Submit clicked. Errors:", errors);
        onSubmit(e);
      }} 
      noValidate // Keeps our custom error styling active
    >
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className={`flex items-center gap-2 ${step === 1 ? 'text-green-700' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-green-700 text-white' : 'bg-gray-200'}`}>1</div>
          <span className="text-xs font-semibold">Patient Info</span>
        </div>
        <div className="flex-1 h-px bg-gray-100 mx-4" />
        <div className={`flex items-center gap-2 ${step === 2 ? 'text-green-700' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-green-700 text-white' : 'bg-gray-200'}`}>2</div>
          <span className="text-xs font-semibold">Booking</span>
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <label className="block text-xs font-medium text-blue-900 mb-1">Full Name *</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
              <input type="text" value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Patient's full name" className={`${fieldCls('name')} pl-9`} />
            </div>
            {errors.name && <p className="text-red-500 text-[10px] mt-0.5">{errors.name}</p>}
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="block text-xs font-medium text-blue-900 mb-1">Mobile *</label>
              <div className="relative">
                <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
                <input type="tel" value={formData.mobile} onChange={(e) => updateField('mobile', e.target.value)} placeholder="10-digit" className={`${fieldCls('mobile')} pl-9`} />
              </div>
              {errors.mobile && <p className="text-red-500 text-[10px] mt-0.5">{errors.mobile}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-blue-900 mb-1">WhatsApp *</label>
              <input type="tel" value={formData.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} placeholder="Number" className={fieldCls('whatsapp')} />
            </div>
          </div>
          <button type="button" onClick={() => updateField('whatsapp', formData.mobile)} className="text-[10px] text-green-700 font-semibold hover:underline block ml-auto">Same as mobile?</button>

          <div>
            <label className="block text-xs font-medium text-blue-900 mb-1">Email (Optional)</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
              <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="example@gmail.com" className={`${fieldCls('email')} pl-9`} />
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="block text-xs font-medium text-blue-900 mb-1">Age *</label>
              <input type="number" value={formData.age} onChange={(e) => updateField('age', e.target.value)} placeholder="Years" className={fieldCls('age')} />
              {errors.age && <p className="text-red-500 text-[10px] mt-0.5">{errors.age}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-blue-900 mb-1">Gender *</label>
              <select value={formData.gender} onChange={(e) => updateField('gender', e.target.value)} className={fieldCls('gender')}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              {errors.gender && <p className="text-red-500 text-[10px] mt-0.5">{errors.gender}</p>}
            </div>
          </div>

          {/* Cleanly Integrated AddressSection Component */}
          <AddressSection 
            formData={formData} 
            errors={errors} 
            updateField={updateField} 
            fieldCls={fieldCls} 
          />

          <button 
            type="button" 
            onClick={handleNextStep}
            disabled={isSavingLead}
            className="w-full py-3 mt-4 bg-green-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            {isSavingLead ? 'Saving...' : 'Next Step'} <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-blue-900">Select Test(s) *</label>
              <button type="button" onClick={() => setShowRates(true)} className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                <Info size={10} /> Rates
              </button>
            </div>
            <TestSelector 
              selected={formData.selectedTests} 
              onChange={(val) => updateField('selectedTests', val)} 
              options={[...(labSettings?.available_tests.map((t: any) => typeof t === 'object' ? t.name : t) || []), "Prescribed (Upload Below)"]} 
            />
            {errors.tests && <p className="text-red-500 text-[10px] mt-0.5">{errors.tests}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-900 mb-1">Prescription (Optional)</label>
            <label className="border-2 border-dashed border-green-200 rounded-lg p-3 flex flex-col items-center bg-green-50 cursor-pointer">
              <Upload size={18} className="text-green-700 mb-1" />
              <p className="text-[10px] text-gray-500">{formData.prescriptionFile ? formData.prescriptionFile.name : 'Tap to upload'}</p>
              <input type="file" className="hidden" onChange={(e) => updateField('prescriptionFile', e.target.files?.[0] || null)} />
            </label>
          </div>

          {/* Integrated AddressSection Structure */}
          <div className="w-full space-y-3 p-3.5 border border-gray-200 rounded-lg bg-white shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-2">
                Sample Collection Method *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label 
                  className={`flex items-center justify-center py-2 px-3 border rounded-lg cursor-pointer text-xs font-medium transition-all ${
                    (formData.bookingType || 'walk-in') === 'walk-in' 
                      ? 'border-green-700 bg-green-50 text-green-800 ring-2 ring-green-100 font-semibold' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="bookingType"
                    value="walk-in"
                    checked={(formData.bookingType || 'walk-in') === 'walk-in'}
                    onChange={() => handleBookingTypeChange('walk-in')}
                    className="sr-only"
                  />
                  Visit the Lab
                </label>

                <label 
                  className={`flex items-center justify-center py-2 px-3 border rounded-lg cursor-pointer text-xs font-medium transition-all ${
                    formData.bookingType === 'home' 
                      ? 'border-green-700 bg-green-50 text-green-800 ring-2 ring-green-100 font-semibold' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="bookingType"
                    value="home"
                    checked={formData.bookingType === 'home'}
                    onChange={() => handleBookingTypeChange('home')}
                    className="sr-only"
                  />
                  Home Collection
                </label>
              </div>
            </div>

            {formData.bookingType === 'home' && (
              <div className="pt-2.5 border-t border-gray-100 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
                  <MapPin size={12} /> Address confirmed from patient profile details.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="block text-xs font-medium text-blue-900 mb-1">Date *</label>
              <input type="date" min={getLocalDate()} value={formData.date} onChange={(e) => updateField('date', e.target.value)} className={fieldCls('date')} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-blue-900 mb-1">Time *</label>
              <select value={formData.timeSlot} onChange={(e) => updateField('timeSlot', e.target.value)} className={fieldCls('timeSlot')}>
                <option value="">Select</option>
                {slots.map(({ value, disabled }) => (
                  <option key={value} value={value} disabled={disabled}>{value} {disabled ? '(Past)' : ''}</option>
                ))}
              </select>
              {errors.timeSlot && <p className="text-red-500 text-[10px] mt-0.5">{errors.timeSlot}</p>}
            </div>
          </div>

          <div className="flex gap-2 items-start py-2">
            <input type="checkbox" checked={formData.termsChecked} onChange={(e) => updateField('termsChecked', e.target.checked)} className="w-4 h-4 accent-green-700 mt-0.5" />
            <label className="text-[11px] text-gray-600">
              I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-green-700 underline">Terms</button>
            </label>
          </div>
          {errors.terms && <p className="text-red-500 text-[10px]">{errors.terms}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-lg flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button type="submit" disabled={submitting} className="flex-[2] py-3 bg-green-700 text-white font-semibold rounded-lg disabled:bg-gray-400 transition-all active:scale-[0.98]">
              {submitting ? 'Processing...' : btnLabel}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
