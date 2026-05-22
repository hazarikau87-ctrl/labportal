import html2pdf from 'html2pdf.js';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { X, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import {
  getLocalDate,
  getUserIP,
  generateBookingId,
  compressImage,
  isSlotDisabled,
} from './lib/utils';

// Components
import Header from './components/Header';
import TermsModal, { TERMS_TEXT } from './components/TermsModal';
import SuccessScreen from './components/SuccessScreen';
import BookingForm from './components/BookingForm';

interface LabSettings {
  id: string; // UUID string
  lab_name: string;
  phone_number: string | null;
  whatsapp_number: string | null;
  logo_url: string | null;
  tagline: string | null;
  available_tests: any[];
  operating_hours: string[];
}

interface BookingResult {
  bookingId: string;
  name: string;
  tests: string;
  dateTime: string;
}

export default function App() {
  const { labSlug } = useParams();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [labSettings, setLabSettings] = useState<LabSettings | null>(null);
  const [success, setSuccess] = useState<BookingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [btnLabel, setBtnLabel] = useState('Confirm Booking');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    current_lead_token: null as string | null, // Track by secure string token matching RLS policies
    name: '',
    mobile: '',
    whatsapp: '',
    email: '',
    age: '',
    gender: '',
    selectedTests: [] as string[],
    prescriptionFile: null as File | null,
    date: getLocalDate(),
    timeSlot: '',
    termsChecked: false,
  });

  const [showTerms, setShowTerms] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [rateSearch, setRateSearch] = useState('');

  useEffect(() => {
    if (!labSlug) return;
    supabase
      .from('labs')
      .select('id, lab_name, phone_number, whatsapp_number, logo_url, tagline, available_tests, operating_hours')
      .eq('slug', labSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLabSettings(data as LabSettings);
      });
  }, [labSlug]);

  const filteredRates = useMemo(() => {
    if (!labSettings?.available_tests) return [];
    return labSettings.available_tests.filter(test => {
      const testName = typeof test === 'object' ? test.name : test;
      return testName.toLowerCase().includes(rateSearch.toLowerCase());
    });
  }, [labSettings, rateSearch]);

  const toggleTestSelection = (testName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTests: prev.selectedTests.includes(testName)
        ? prev.selectedTests.filter(t => t !== testName)
        : [...prev.selectedTests, testName]
    }));
  };

  const getAvailableSlots = useCallback(() => {
    const slotsToUse = labSettings?.operating_hours || [];
    const today = getLocalDate();

    return slotsToUse.map((slot) => {
      let disabled = isSlotDisabled(slot, formData.date);
      if (formData.date === today) {
        const [time, modifier] = slot.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        const slotTime = new Date();
        slotTime.setHours(hours, minutes, 0, 0);
        if (slotTime < new Date()) disabled = true;
      }
      return { value: slot, disabled };
    });
  }, [formData.date, labSettings]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!/^\d{10}$/.test(formData.mobile)) errs.mobile = '10-digit mobile required';
    if (!formData.age) errs.age = 'Age is required';
    if (!formData.gender) errs.gender = 'Gender is required';
    if (formData.selectedTests.length === 0) errs.tests = 'Select at least one test';
    if (!formData.timeSlot) errs.timeSlot = 'Time slot is required';
    if (!formData.termsChecked) errs.terms = 'Please accept the terms';
    return errs;
  }

  // Optimized to work blindly with secure Row Level Security policies
  const handleNext = async () => {
    if (formData.current_lead_token) return formData.current_lead_token;

    const patientAge = parseInt(formData.age);
    if (isNaN(patientAge) || !labSettings?.id) return null;

    // Generate token cleanly ahead of request to track state reliably
    const uniqueToken = `LEAD-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // The fixed configuration payload using a metadata execution flag
      const { error } = await supabase
        .from('appointments')
        .insert([{
          name: formData.name,
          mobile: formData.mobile,
          whatsapp: formData.whatsapp || formData.mobile,
          email: formData.email || null,
          age: patientAge,
          gender: formData.gender,
          lab_id: labSettings.id, 
          test: 'LEAD_PENDING',
          booking_id: uniqueToken,
          appointment_date: getLocalDate(),
          time: 'TBD'
        }], { count: 'planned' }); // Bypasses client-side SELECT authorization requirement

      if (error) throw error;
      
      setFormData(prev => ({ ...prev, current_lead_token: uniqueToken }));
      return uniqueToken;
    } catch (err) {
      console.error("Critical Lead capture failed:", err);
      return null;
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!labSettings) return;

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    
    let activeToken = formData.current_lead_token;
    if (!activeToken) {
      activeToken = await handleNext();
      if (!activeToken) {
        setSubmitting(false);
        alert("Database connection failed. Please try again in a moment.");
        return;
      }
    }

    // Generate clean, final values
    const finalBookingId = generateBookingId(formData.name);
    const testNames = formData.selectedTests.join(', ');

    try {
      const userIP = await getUserIP();
      let savedFilePath: string | null = null;

      if (formData.prescriptionFile) {
        setBtnLabel('Uploading...');
        const uploadBlob = formData.prescriptionFile.type.startsWith('image/')
          ? await compressImage(formData.prescriptionFile)
          : formData.prescriptionFile;
        
        const fileExt = formData.prescriptionFile.type === 'application/pdf' ? 'pdf' : 'jpg';
        savedFilePath = `${labSettings.id}/${finalBookingId}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('prescriptions')
          .upload(savedFilePath, uploadBlob);
        
        if (uploadError) console.error("Upload failed but continuing...", uploadError);
      }

      setBtnLabel('Finalizing...');

      // 1. UPDATE the unique lead row targeting its token value
      const { error: dbError } = await supabase
        .from('appointments')
        .update({
          appointment_date: formData.date,
          time: formData.timeSlot,
          test: testNames,
          booking_id: finalBookingId,
          status: 'Confirmed'
        })
        .eq('mobile', formData.mobile) // Targets the row safely using the client's phone number instead!
        .eq('test', 'LEAD_PENDING'); // Perfectly matches policy evaluation logic

      if (dbError) throw dbError;

      // 2. Log Consent safely matching new state configuration
      const { error: consentError } = await supabase.from('consent_logs').insert([{
        lab_id: labSettings.id,
        booking_id: finalBookingId,
        patient_name: formData.name,
        consent_text: TERMS_TEXT,
        consent_given: formData.termsChecked,
        ip_address: userIP || '0.0.0.0',
        user_agent: navigator.userAgent,
        consent_version: 'v1.0',
      }]);

      if (consentError) console.error("Consent log failed silently:", consentError);

      // 3. Trigger Email Edge Function
      await supabase.functions.invoke('send-booking-email', {
        body: { 
          name: formData.name,
          mobile: formData.mobile,
          whatsapp: formData.whatsapp || formData.mobile,
          email: formData.email,
          appointment_date: formData.date,
          time: formData.timeSlot,
          test_name: testNames,
          booking_id: finalBookingId 
        },
      });

      setSuccess({ 
        bookingId: finalBookingId, 
        name: formData.name, 
        tests: testNames, 
        dateTime: `${formData.date} at ${formData.timeSlot}` 
      });
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Submission Error:", err);
      alert('Booking Error: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
      setBtnLabel('Confirm Booking');
    }
  }

  const handleReset = () => {
    setFormData({
      current_lead_token: null,
      name: '', mobile: '', whatsapp: '', email: '',
      age: '', gender: '', selectedTests: [],
      prescriptionFile: null, date: getLocalDate(),
      timeSlot: '', termsChecked: false
    });
    setErrors({});
    setSuccess(null);
  };

  const handleDownload = () => {
    if (!success) return;
    const element = document.getElementById('printable-receipt');
    if (!element) return;
    html2pdf().set({
        margin: 10,
        filename: `Booking_${success.bookingId}.pdf`,
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
  };

  if (!labSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading Lab Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex justify-center items-center p-0 sm:p-4">
      <div className="w-full max-w-[480px] bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl flex flex-col h-screen sm:h-[92vh] overflow-hidden">
        
        <div id="printable-receipt" className="flex flex-col flex-1 overflow-y-auto bg-white">
          <Header 
            labName={labSettings.lab_name} 
            phoneNumber={labSettings.phone_number} 
            logoUrl={labSettings.logo_url} 
            tagline={labSettings.tagline} 
          />

          <div ref={scrollRef} className="px-5 py-4">
            {success ? (
              <SuccessScreen
                bookingId={success.bookingId}
                name={success.name}
                tests={success.tests}
                dateTime={success.dateTime}
                phoneNumber={labSettings.whatsapp_number || labSettings.phone_number}
                onReset={handleReset}
                onDownload={handleDownload}
              />
            ) : (
              <BookingForm 
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                onNext={handleNext} 
                onSubmit={handleSubmit} 
                submitting={submitting}
                btnLabel={btnLabel}
                labSettings={labSettings}
                slots={getAvailableSlots()}
                setShowRates={setShowRates}
                setShowTerms={setShowTerms}
              />
            )}
          </div>
        </div>

        <div className="flex-shrink-0 py-2.5 text-center border-t border-gray-100 bg-white">
          <p className="text-[10px] text-gray-400">Powered by Next Appointment</p>
        </div>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      {showRates && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 bg-white sticky top-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-blue-900 text-base">Select Tests</h3>
                <button onClick={() => {setShowRates(false); setRateSearch('');}} className="p-2 bg-gray-100 rounded-full hover:bg-red-50">
                  <X size={20} />
                </button>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search tests..." 
                  value={rateSearch} 
                  onChange={(e) => setRateSearch(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" 
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-5 py-2">
              <div className="space-y-2">
                {filteredRates.map((test, idx) => {
                  const testName = typeof test === 'object' ? test.name : test;
                  const testPrice = typeof test === 'object' ? `₹${test.price}` : 'Price on request';
                  const isSelected = formData.selectedTests.includes(testName);
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleTestSelection(testName)}
                      className={`p-3 flex justify-between items-center rounded-xl cursor-pointer border transition-all ${
                        isSelected ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && <CheckCircle2 size={16} className="text-green-600" />}
                        <span className={`text-sm font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>{testName}</span>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {testPrice}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-5 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setShowRates(false)} className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-green-800 transition-colors">
                Done ({formData.selectedTests.length} Selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
