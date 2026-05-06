import html2pdf from 'html2pdf.js';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Smartphone, Mail, Upload, Calendar, Clock, X, Search, Info, CheckCircle2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { supabase } from './lib/supabase';
import {
  getLocalDate,
  getUserIP,
  generateBookingId,
  compressImage,
  isSlotDisabled,
} from './lib/utils';
import Header from './components/Header';
import TestSelector from './components/TestSelector';
import TermsModal, { TERMS_TEXT } from './components/TermsModal';
import SuccessScreen from './components/SuccessScreen';

interface LabSettings {
  id: string;
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
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [date, setDate] = useState(getLocalDate());
  const [timeSlot, setTimeSlot] = useState('');
  const [termsChecked, setTermsChecked] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [rateSearch, setRateSearch] = useState(''); 
  const [submitting, setSubmitting] = useState(false);
  const [btnLabel, setBtnLabel] = useState('Confirm Booking');
  const [success, setSuccess] = useState<BookingResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setSelectedTests(prev => 
      prev.includes(testName) 
        ? prev.filter(t => t !== testName) 
        : [...prev, testName]
    );
  };

  const getAvailableSlots = useCallback(() => {
    const slotsToUse = labSettings?.operating_hours || [];
    const today = getLocalDate();
    
    return slotsToUse.map((slot) => {
      let disabled = isSlotDisabled(slot, date);
      
      // EXTRA SAFETY: If selected date is today, check if time has passed
      if (date === today) {
        const [time, modifier] = slot.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        
        const slotTime = new Date();
        slotTime.setHours(hours, minutes, 0, 0);
        
        if (slotTime < new Date()) {
          disabled = true;
        }
      }
      
      return { value: slot, disabled };
    });
  }, [date, labSettings]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Required';
    if (!/^\d{10}$/.test(mobile)) errs.mobile = 'Enter valid 10-digit number';
    if (!/^\d{10}$/.test(whatsapp)) errs.whatsapp = 'Enter valid 10-digit number';
    if (!age || parseInt(age) < 1) errs.age = 'Required';
    if (!gender) errs.gender = 'Required';
    if (selectedTests.length === 0) errs.tests = 'Select at least one test';
    if (!date) errs.date = 'Required';
    if (!timeSlot) errs.time = 'Required';
    
    // Check if slot is disabled again at validation time
    const available = getAvailableSlots();
    const selectedSlotObj = available.find(s => s.value === timeSlot);
    if (selectedSlotObj?.disabled) errs.time = 'This slot has already passed';

    if (!termsChecked) errs.terms = 'You must agree to proceed';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!labSettings) return;

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const bookingId = generateBookingId(name);
    const testNames = selectedTests.join(', ');
    const labFolder = labSettings.id;

    try {
      const userIP = await getUserIP();
      let savedFilePath: string | null = null;

      if (prescriptionFile) {
        setBtnLabel('Uploading prescription...');
        const uploadBlob = prescriptionFile.type.startsWith('image/')
          ? await compressImage(prescriptionFile)
          : prescriptionFile;
        
        const fileExt = prescriptionFile.type === 'application/pdf' ? 'pdf' : 'jpg';
        savedFilePath = `${labFolder}/${bookingId}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('prescriptions')
          .upload(savedFilePath, uploadBlob);
        if (uploadError) throw uploadError;
      }

      setBtnLabel('Finalizing booking...');

      const formData = {
        name, mobile, whatsapp,
        email: email || null,
        age: parseInt(age),
        gender,
        appointment_date: date,
        time: timeSlot,
        test: testNames,
        booking_id: bookingId,
        lab_id: labSettings.id,
        prescription_url: savedFilePath,
      };

      const { error: dbError } = await supabase.from('appointments').insert([formData]);
      if (dbError) throw dbError;

      await supabase.from('consent_logs').insert([{
        lab_id: labSettings.id,
        booking_id: bookingId,
        patient_name: name,
        consent_text: TERMS_TEXT,
        consent_given: termsChecked,
        ip_address: userIP || '0.0.0.0',
        user_agent: navigator.userAgent,
        consent_version: 'v1.0',
      }]);

      await supabase.functions.invoke('send-booking-email', {
        body: {
          ...formData,
          patient_name: name,
          test_name: testNames,
          appointment_date: `${date} at ${timeSlot}`,
        },
      });

      setSuccess({ bookingId, name, tests: testNames, dateTime: `${date} at ${timeSlot}` });
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
      setBtnLabel('Confirm Booking');
    }
  }

  function handleReset() {
    setName(''); setMobile(''); setWhatsapp(''); setEmail('');
    setAge(''); setGender(''); setSelectedTests([]);
    setPrescriptionFile(null); setDate(getLocalDate());
    setTimeSlot(''); setTermsChecked(false);
    setErrors({}); setSuccess(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDownload() {
    if (!success) return;
    const element = document.getElementById('printable-receipt');
    if (!element) return;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Receipt_${success.bookingId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: element.scrollWidth },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }

  if (!labSettings) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500 animate-pulse">Loading Laboratory Portal...</p></div>;
  }

  const slots = getAvailableSlots();
  const fieldCls = (key: string) => `w-full px-3 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none focus:bg-white transition-colors ${errors[key] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-600'}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex justify-center items-center p-0 sm:p-4">
      <div className="w-full max-w-[480px] bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl flex flex-col h-screen sm:h-[92vh] overflow-hidden">
        
        <div id="printable-receipt" className="flex flex-col flex-1 overflow-y-auto bg-white">
          <Header labName={labSettings.lab_name} phoneNumber={labSettings.phone_number} logoUrl={labSettings.logo_url} tagline={labSettings.tagline} />

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
              <form onSubmit={handleSubmit} noValidate>
                {/* Full Name with Auto-fill */}
                <div className="mb-3">
                  <label htmlFor="patient_name" className="block text-xs font-medium text-blue-900 mb-1">Full Name *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700 pointer-events-none" />
                    <input 
                      id="patient_name" 
                      name="name"
                      autoComplete="name"
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Patient's full name" 
                      className={`${fieldCls('name')} pl-9`} 
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name}</p>}
                </div>

                {/* Contact Section with Auto-fill */}
                <div className="flex gap-2.5 mb-1">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">Mobile *</label>
                    <div className="relative">
                      <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
                      <input 
                        name="tel"
                        autoComplete="tel"
                        type="tel" 
                        value={mobile} 
                        onChange={(e) => setMobile(e.target.value)} 
                        placeholder="10-digit" 
                        className={`${fieldCls('mobile')} pl-9`} 
                      />
                    </div>
                    {errors.mobile && <p className="text-red-500 text-xs mt-0.5">{errors.mobile}</p>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">WhatsApp *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#25D366] text-[10px] font-bold">WA</span>
                      <input 
                        type="tel" 
                        value={whatsapp} 
                        onChange={(e) => setWhatsapp(e.target.value)} 
                        placeholder="Number" 
                        className={`${fieldCls('whatsapp')} pl-9`} 
                      />
                    </div>
                    {errors.whatsapp && <p className="text-red-500 text-xs mt-0.5">{errors.whatsapp}</p>}
                  </div>
                </div>
                <div className="text-right mb-3">
                  <button type="button" onClick={() => setWhatsapp(mobile)} className="text-xs text-green-700 font-semibold hover:underline">Same as mobile?</button>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-blue-900 mb-1">Email (Optional)</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
                    <input 
                      name="email"
                      autoComplete="email"
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="example@gmail.com" 
                      className={`${fieldCls('email')} pl-9`} 
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">Age *</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Years" className={fieldCls('age')} />
                    {errors.age && <p className="text-red-500 text-xs mt-0.5">{errors.age}</p>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">Gender *</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className={fieldCls('gender')}>
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                    {errors.gender && <p className="text-red-500 text-xs mt-0.5">{errors.gender}</p>}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-blue-900">Select Test(s) *</label>
                    <button type="button" onClick={() => setShowRates(true)} className="text-[10px] font-bold text-red-700 hover:underline bg-red-50 px-2 py-0.5 rounded transition-colors flex items-center gap-1">
                      <Info size={10} /> Check Rates & Select
                    </button>
                  </div>
                  <TestSelector 
                    selected={selectedTests} 
                    onChange={setSelectedTests} 
                    options={[...(labSettings?.available_tests.map(t => typeof t === 'object' ? t.name : t) || []), "Prescribed (Upload Below)"]} 
                  />
                  {errors.tests && <p className="text-red-500 text-xs mt-0.5">{errors.tests}</p>}
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-blue-900 mb-1">Prescription (Optional)</label>
                  <label className="border-2 border-dashed border-green-600 rounded-lg p-3 flex flex-col items-center bg-green-50 cursor-pointer">
                    <Upload size={18} className="text-green-700 mb-1" />
                    <p className="text-xs text-gray-500">{prescriptionFile ? prescriptionFile.name : 'Tap to upload (Max 1MB)'}</p>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setPrescriptionFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>

                <div className="flex gap-2.5 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">Date *</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
                      <input 
                        type="date" 
                        value={date} 
                        min={getLocalDate()} 
                        onChange={(e) => { setDate(e.target.value); setTimeSlot(''); }} 
                        className={`${fieldCls('date')} pl-9`} 
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">Time *</label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
                      <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className={`${fieldCls('time')} pl-9`}>
                        <option value="">Select</option>
                        {slots.map(({ value, disabled }) => (
                          <option key={value} value={value} disabled={disabled}>
                            {value} {disabled ? '(Past)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.time && <p className="text-red-500 text-xs mt-0.5">{errors.time}</p>}
                  </div>
                </div>

                <div className="flex gap-2 items-start mb-1 mt-2">
                  <input type="checkbox" id="termsCheck" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} className="w-4 h-4 accent-green-700 mt-0.5 flex-shrink-0" />
                  <label htmlFor="termsCheck" className="text-xs text-gray-600 leading-relaxed">
                    I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-green-700 font-semibold hover:underline">Terms</button> & consent to WhatsApp results.
                  </label>
                </div>
                {errors.terms && <p className="text-red-500 text-xs mb-2">{errors.terms}</p>}

                <button type="submit" disabled={submitting} className="w-full py-3 mt-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-all disabled:bg-gray-400 text-sm mb-3">
                  {btnLabel}
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 py-2.5 text-center border-t border-gray-100 bg-white" data-html2canvas-ignore="true">
          <p className="text-[10px] text-gray-400">Powered by Next Appointment</p>
        </div>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      {showRates && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-blue-900 text-base">Select Tests</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Tap to select/deselect tests</p>
                </div>
                <button onClick={() => {setShowRates(false); setRateSearch('');}} className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {filteredRates.length > 0 ? (
                <div className="space-y-2">
                  {filteredRates.map((test, idx) => {
                    const isObject = typeof test === 'object';
                    const testName = isObject ? test.name : test;
                    const testPrice = isObject ? `₹${test.price}` : 'Contact Lab';
                    const isSelected = selectedTests.includes(testName);
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleTestSelection(testName)}
                        className={`p-3 flex justify-between items-center rounded-xl cursor-pointer border transition-all ${
                          isSelected 
                            ? 'bg-green-50 border-green-200 ring-1 ring-green-200' 
                            : 'bg-white border-gray-100 hover:border-green-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected && <CheckCircle2 size={16} className="text-green-600" />}
                          <span className={`text-sm font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>
                            {testName}
                          </span>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {testPrice}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400">
                  <p className="text-xs italic">No tests found matching "{rateSearch}"</p>
                </div>
              )}
            </div>
            
            <div className="p-5 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setShowRates(false)} className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-green-800">
                Done ({selectedTests.length} Selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
