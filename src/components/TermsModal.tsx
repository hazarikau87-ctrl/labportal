interface TermsModalProps {
  onClose: () => void;
}

export const TERMS_TEXT = `1. Data Collection: We collect your name, age, and contact details to process diagnostic lab reports.

2. Health Records: Clinical data is stored securely in compliance with the DPDP Act (2023).

3. WhatsApp Delivery: By checking the box, you agree to receive automated PDF reports on your registered WhatsApp number.

4. Retention: Per medical guidelines, records are maintained for a period of 7 years.

5. Withdrawal: You may contact the lab's Grievance Officer at any time to withdraw consent.`;

export default function TermsModal({ onClose }: TermsModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl">
        <h3 className="text-green-700 font-semibold text-base mb-3">Terms &amp; Conditions</h3>
        <div className="text-xs text-gray-600 h-60 overflow-y-auto leading-relaxed border-b border-gray-100 mb-4 pr-2 space-y-2">
          {TERMS_TEXT.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
