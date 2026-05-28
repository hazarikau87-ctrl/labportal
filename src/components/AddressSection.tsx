import { MapPin } from 'lucide-react';

interface AddressSectionProps {
  formData: any;
  updateField: (field: string, value: any) => void;
  errors: Record<string, string>;
  fieldCls: (key: string) => string;
}

export default function AddressSection({
  formData,
  updateField,
  errors,
  fieldCls
}: AddressSectionProps) {
  return (
    <div className="pt-3 border-t border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <p className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
        <MapPin size={12} /> Please enter collection address details below.
      </p>

      <div>
        <label htmlFor="addressLine" className="block text-xs font-medium text-blue-900 mb-1">
          Flat/House No., Building, Street *
        </label>
        <div className="relative">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
          <input
            type="text"
            id="addressLine"
            value={formData.addressLine || ''}
            onChange={(e) => updateField('addressLine', e.target.value)}
            placeholder="e.g., House No. 12, ABC Heights"
            className={`${fieldCls('addressLine')} pl-9`}
          />
        </div>
        {errors.addressLine && <p className="text-red-500 text-[10px] mt-0.5">{errors.addressLine}</p>}
      </div>

      <div className="flex gap-2.5">
        <div className="flex-1">
          <label htmlFor="pincode" className="block text-xs font-medium text-blue-900 mb-1">
            Pincode *
          </label>
          <input
            type="text"
            id="pincode"
            maxLength={6}
            value={formData.pincode || ''}
            onChange={(e) => updateField('pincode', e.target.value)}
            placeholder="6-digit PIN"
            className={fieldCls('pincode')}
          />
          {errors.pincode && <p className="text-red-500 text-[10px] mt-0.5">{errors.pincode}</p>}
        </div>

        <div className="flex-1">
          <label htmlFor="landmark" className="block text-xs font-medium text-blue-900 mb-1">
            Landmark (Optional)
          </label>
          <input
            type="text"
            id="landmark"
            value={formData.landmark || ''}
            onChange={(e) => updateField('landmark', e.target.value)}
            placeholder="e.g., Near Apollo Pharmacy"
            className={fieldCls('landmark')}
          />
        </div>
      </div>
    </div>
  );
}
