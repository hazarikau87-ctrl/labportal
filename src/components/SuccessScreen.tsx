import { CheckCircle, Download, Plus } from 'lucide-react';

interface SuccessScreenProps {
  bookingId: string;
  name: string;
  tests: string;
  dateTime: string;
  onReset: () => void;
  onDownload: () => void;
}

export default function SuccessScreen({
  bookingId,
  name,
  tests,
  dateTime,
  onReset,
  onDownload,
}: SuccessScreenProps) {
  return (
    <div className="text-center py-4 px-1" id="successBox">
      <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={32} className="text-green-700" />
      </div>
      <h2 className="text-gray-800 font-semibold text-xl mb-2">Booking Confirmed</h2>
      <div className="inline-block bg-green-50 border-2 border-green-700 text-green-700 px-5 py-1.5 rounded-lg font-bold text-lg tracking-widest mb-4">
        {bookingId}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 text-left shadow-sm">
        <div className="flex justify-between py-2 border-b border-dashed border-gray-200">
          <span className="text-xs text-gray-500">Patient</span>
          <span className="text-sm font-semibold text-gray-800">{name}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-dashed border-gray-200">
          <span className="text-xs text-gray-500">Test Type</span>
          <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%]">{tests}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-xs text-gray-500">Date &amp; Time</span>
          <span className="text-sm font-semibold text-gray-800">{dateTime}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onDownload}
        className="w-full py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-950 transition-colors mb-3 flex items-center justify-center gap-2 text-sm"
      >
        <Download size={16} /> Download Receipt
      </button>
      <button
        type="button"
        onClick={onReset}
        className="w-full py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <Plus size={16} /> Book New Appointment
      </button>
    </div>
  );
}
