import { Phone, FlaskConical } from 'lucide-react';

interface HeaderProps {
  labName: string;
  phoneNumber: string | null;
}

export default function Header({ labName, phoneNumber }: HeaderProps) {
  return (
    <div className="flex-shrink-0 bg-white px-5 py-3 border-b border-gray-100 text-center relative">
      {phoneNumber && (
        <a
          href={`tel:${phoneNumber}`}
          className="absolute top-3 right-5 bg-green-700 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-green-800 transition-colors"
          title="Call Us"
        >
          <Phone size={14} />
        </a>
      )}
      <div className="flex justify-center mb-1">
        <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
          <FlaskConical size={20} className="text-green-700" />
        </div>
      </div>
      <h2 className="font-semibold text-green-700 text-lg leading-tight">{labName}</h2>
      <p className="text-xs text-gray-500 mt-0.5">Accurate Results &bull; Trusted Care</p>
    </div>
  );
}
