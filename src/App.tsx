import html2pdf from 'html2pdf.js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Smartphone, Mail, Upload, Calendar, Clock } from 'lucide-react';
import { supabase } from './lib/supabase';
import { labConfig } from './config/labs';
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

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
];

interface LabSettings {
  lab_name: string;
  phone_number: string | null;
}

interface BookingResult {
  bookingId: string;
  name: string;
  tests: string;
  dateTime: string;
}

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [labSettings, setLabSettings] = useState<LabSettings>({ lab_name: 'City Diagnostic Center', phone_number: null });
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
  const [submitting, setSubmitting] = useState(false);
  const [btnLabel, setBtnLabel] = useState('Confirm Booking');
  const [success, setSuccess] = useState<BookingResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from('labs')
      .select('lab_name, phone_number')
      .eq('id', labConfig.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLabSettings(data as LabSettings);
      });
  }, []);

  const getAvailableSlots = useCallback(() => {
    return TIME_SLOTS.map((slot) => ({
      value: slot,
      disabled: isSlotDisabled(slot, date),
    }));
  }, [date]);

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
    if (timeSlot && isSlotDisabled(timeSlot, date)) errs.time = 'Slot no longer available';
    if (!termsChecked) errs.terms = 'You must agree to proceed';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const bookingId = generateBookingId(name);
    const testNames = selectedTests.join(', ');
    const labSlug = labSettings.lab_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

    try {
      const userIP = await getUserIP();
      let savedFilePath: string | null = null;

      if (prescriptionFile) {
        setBtnLabel('Uploading prescription...');
        const uploadBlob = prescriptionFile.type.startsWith('image/')
          ? await compressImage(prescriptionFile)
          : prescriptionFile;
        const fileExt = prescriptionFile.type === 'application/pdf' ? 'pdf' : 'jpg';
        savedFilePath = `${labSlug}_${labConfig.id}/${bookingId}.${fileExt}`;
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
        lab_id: labConfig.id,
        prescription_url: savedFilePath,
      };

      const consentData = {
        lab_id: labConfig.id,
        booking_id: bookingId,
        patient_name: name,
        consent_text: TERMS_TEXT,
        consent_given: termsChecked,
        ip_address: userIP || '0.0.0.0',
        user_agent: navigator.userAgent,
        consent_version: 'v1.0',
      };

      const { error: dbError } = await supabase.from('appointments').insert([formData]);
      if (dbError) throw dbError;

      const { error: consentError } = await supabase.from('consent_logs').insert([consentData]);
      if (consentError) throw consentError;

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
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      letterRendering: true,
      // We remove scrollY: 0 and instead ensure the element is treated as a full-height block
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Create a worker instance to handle the "cloning" logic
  const worker = html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
    // This ensures the PDF is saved
    pdf.save();
  });
}

  const slots = getAvailableSlots();
  const fieldCls = (key: string) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none focus:bg-white transition-colors ${
      errors[key] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-600'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex justify-center items-center p-0 sm:p-4">
      <div className="w-full max-w-[480px] bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl flex flex-col h-screen sm:h-[92vh] overflow-hidden">
        
        <div id="printable-receipt" className="flex flex-col flex-1 overflow-y-auto bg-white">
          <Header labName={labSettings.lab_name} phoneNumber={labSettings.phone_number} />

          <div ref={scrollRef} className="px-5 py-4">
            {success ? (
              <SuccessScreen
                bookingId={success.bookingId}
                name={success.name}
                tests={success.tests}
                dateTime={success.dateTime}
                onReset={handleReset}
                onDownload={handleDownload}
              />
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {/* Full Name */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-blue-900 mb-1">Full Name *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Patient's full name"
                      className={`${fieldCls('name')} pl-9`}
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name}</p>}
                </div>

                {/* Mobile + WhatsApp */}
                <div className="flex gap-2.5 mb-1">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">Mobile *</label>
                    <div className="relative">
                      <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700 pointer-events-none" />
                      <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit" className={`${fieldCls('mobile')} pl-9`} />
                    </div>
                    {errors.mobile && <p className="text-red-500 text-xs mt-0.5">{errors.mobile}</p>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">WhatsApp *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#25D366] text-[10px] font-bold pointer-events-none">WA</span>
                      <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Number" className={`${fieldCls('whatsapp')} pl-9`} />
                    </div>
                    {errors.whatsapp && <p className="text-red-500 text-xs mt-0.5">{errors.whatsapp}</p>}
                  </div>
                </div>
                <div className="text-right mb-3">
                  <button type="button" onClick={() => setWhatsapp(mobile)} className="text-xs text-green-700 font-semibold hover:underline">Same as mobile?</button>
                </div>

                {/* Email */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-blue-900 mb-1">Email Address (Optional)</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700 pointer-events-none" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" className={`${fieldCls('email')} pl-9`} />
                  </div>
                </div>

                {/* Age + Gender */}
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

                {/* Tests */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-blue-900 mb-1">Select Test(s) *</label>
                  <TestSelector selected={selectedTests} onChange={setSelectedTests} />
                  {errors.tests && <p className="text-red-500 text-xs mt-0.5">{errors.tests}</p>}
                </div>

                {/* Prescription */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-blue-900 mb-1">Prescription (Optional)</label>
                  <label className="border-2 border-dashed border-green-600 rounded-lg p-3 flex flex-col items-center bg-green-50 cursor-pointer hover:bg-green-100 transition-colors">
                    <Upload size={18} className="text-green-700 mb-1" />
                    <p className="text-xs text-gray-500 text-center">{prescriptionFile ? prescriptionFile.name : 'Tap to upload (Max 1MB)'}</p>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setPrescriptionFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>

                {/* Date + Time */}
                <div className="flex gap-2.5 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">Date *</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700 pointer-events-none" />
                      <input type="date" value={date} min={getLocalDate()} onChange={(e) => { setDate(e.target.value); setTimeSlot(''); }} className={`${fieldCls('date')} pl-9`} />
                    </div>
                    {errors.date && <p className="text-red-500 text-xs mt-0.5">{errors.date}</p>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">Time *</label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700 pointer-events-none" />
                      <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className={`${fieldCls('time')} pl-9`}>
                        <option value="">Select</option>
                        {slots.map(({ value, disabled }) => (
                          <option key={value} value={value} disabled={disabled}>{value}</option>
                        ))}
                      </select>
                    </div>
                    {errors.time && <p className="text-red-500 text-xs mt-0.5">{errors.time}</p>}
                  </div>
                </div>

                {/* Terms */}
                <div className="flex gap-2 items-start mb-1 mt-2">
                  <input type="checkbox" id="termsCheck" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} className="w-4 h-4 accent-green-700 mt-0.5 flex-shrink-0" />
                  <label htmlFor="termsCheck" className="text-xs text-gray-600 leading-relaxed">
                    I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-green-700 font-semibold hover:underline">Terms & Conditions</button> and consent to receiving results via WhatsApp.
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
    </div>
  );
}
