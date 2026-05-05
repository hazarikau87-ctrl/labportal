import { CheckCircle, Download, MessageCircle, RefreshCw } from 'lucide-react';

interface SuccessScreenProps {
  bookingId: string;
  name: string;
  tests: string;
  dateTime: string;
  phoneNumber: string | null; // <--- 1. Add this here
  onReset: () => void;
  onDownload: () => void;
}

export default function SuccessScreen({
  bookingId,
  name,
  tests,
  dateTime,
  phoneNumber, // <--- 2. Destructure it here
  onReset,
  onDownload,
}: SuccessScreenProps) {
  
  const handleWhatsAppContact = () => {
    if (!phoneNumber) {
      alert("Lab contact number not available.");
      return;
    }
  
    // Remove any non-numeric characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Encode message
    const message = `Hi, I have a booking (ID: ${bookingId}) for ${name}.`;
  
    // Use the wa.me format (simpler and more reliable)
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  
    window.open(url, '_blank');
  };

  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={32} className="text-green-700" />
      </div>

      <h2 className="text-gray-800 font-semibold text-xl mb-1">Booking Confirmed</h2>
      <p className="text-gray-500 text-xs mb-6">Your appointment has been scheduled</p>
      
      <div className="inline-block bg-green-50 border border-green-700 text-green-700 px-6 py-2 rounded-lg font-bold text-lg tracking-widest mb-8">
        {bookingId}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 text-left">
        <div className="flex justify-between py-2 border-b border-gray-200">
          <span className="text-[10px] text-gray-500 uppercase font-bold">Patient</span>
          <span className="text-sm font-semibold text-gray-800">{name}</span>
        </div>
        
        <div className="flex justify-between py-2 border-b border-gray-200">
          <span className="text-[10px] text-gray-500 uppercase font-bold">Test(s)</span>
          <span className="text-sm font-semibold text-gray-800 text-right ml-4">{tests}</span>
        </div>
        
        <div className="flex justify-between py-2">
          <span className="text-[10px] text-gray-500 uppercase font-bold">Schedule</span>
          <span className="text-sm font-semibold text-gray-800">{dateTime}</span>
        </div>
      </div>

      <div className="space-y-3" data-html2canvas-ignore="true">
        <button
          type="button"
          onClick={onDownload}
          className="w-full py-3 bg-blue-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm shadow-md"
        >
          <Download size={18} /> Download Receipt
        </button>
        
        <button
          type="button"
          onClick={handleWhatsAppContact}
          className="w-full py-3 bg-[#25D366] text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm shadow-md"
        >
          <MessageCircle size={18} /> Chat with Lab
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-3 text-gray-500 font-semibold flex items-center justify-center gap-2 text-xs hover:text-gray-700 transition-colors"
        >
          <RefreshCw size={14} /> Book Another Appointment
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mt-6 italic" data-html2canvas-ignore="true">
        Please show this receipt at the reception desk.
      </p>
    </div>
  );
}
