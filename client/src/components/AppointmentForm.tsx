import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import type { ApiError, Appointment, AppointmentInput, FieldErrors, Status } from '../types';
import { CloseIcon } from './Icons';
import StatusControl from './StatusControl';

const EMPTY: AppointmentInput = { customerName: '', service: '', dateTime: '', status: 'Pending' };
const ORDER = ['customerName', 'service', 'dateTime', 'status'] as const;

const validate = (f: AppointmentInput): FieldErrors => {
  const e: FieldErrors = {};
  if (!f.customerName.trim()) e.customerName = 'Enter the customer name.';
  if (!f.service.trim()) e.service = 'Enter the service.';
  if (!f.dateTime) e.dateTime = 'Choose a date and time.';
  if (!f.status) e.status = 'Choose a status.';
  return e;
};

interface Props {
  /** When set, the form edits this appointment instead of creating one. */
  editing: Appointment | null;
  onSubmit: (data: AppointmentInput) => Promise<void>;
  onCancel: () => void;
  autoFocus: boolean;
}

export default function AppointmentForm({ editing, onSubmit, onCancel, autoFocus }: Props) {
  const [form, setForm] = useState<AppointmentInput>(editing ? { customerName: editing.customerName, service: editing.service, dateTime: editing.dateTime, status: editing.status } : EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const refs: Record<string, RefObject<HTMLInputElement>> = { customerName: nameRef, service: serviceRef, dateTime: dateRef };

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  const set = <K extends keyof AppointmentInput>(key: K, value: AppointmentInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const local = validate(form);
    setErrors(local);
    const firstBad = ORDER.find((k) => local[k]);
    if (firstBad) {
      refs[firstBad]?.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...form, customerName: form.customerName.trim(), service: form.service.trim() });
      if (!editing) {
        setForm(EMPTY);
        setErrors({});
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.fieldErrors || {});
      setFormError(apiErr.message || 'Could not save the appointment.');
    } finally {
      setSaving(false);
    }
  }

  const count = Object.values(errors).filter(Boolean).length;
  const a11y = (k: keyof AppointmentInput) => ({
    id: k,
    'aria-invalid': errors[k] ? (true as const) : undefined,
    'aria-describedby': errors[k] ? `${k}-err` : undefined,
  });
  const err = (k: keyof AppointmentInput) => (errors[k] ? <p className="err" id={`${k}-err`}>{errors[k]}</p> : null);

  return (
    <form className="form" onSubmit={submit} noValidate aria-labelledby="form-title">
      <div className="form-head">
        <h2 id="form-title">{editing ? 'Edit appointment' : 'New appointment'}</h2>
        <button type="button" className="icon-btn sheet-close" onClick={onCancel} aria-label="Close form"><CloseIcon /></button>
      </div>

      {(formError || count > 0) && (
        <div className="error-box" role="alert">
          {formError || (count === 1 ? 'Fix 1 field to continue.' : `Fix ${count} fields to continue.`)}
        </div>
      )}

      <div className={`field${errors.customerName ? ' bad' : ''}`}>
        <label htmlFor="customerName">Customer name</label>
        <input {...a11y('customerName')} ref={nameRef} value={form.customerName} onChange={(e) => set('customerName', e.target.value)} maxLength={100} autoComplete="off" />
        {err('customerName')}
      </div>

      <div className={`field${errors.service ? ' bad' : ''}`}>
        <label htmlFor="service">Service</label>
        <input {...a11y('service')} ref={serviceRef} value={form.service} onChange={(e) => set('service', e.target.value)} maxLength={100} autoComplete="off" />
        {err('service')}
      </div>

      <div className={`field${errors.dateTime ? ' bad' : ''}`}>
        <label htmlFor="dateTime">Date and time</label>
        <input {...a11y('dateTime')} ref={dateRef} type="datetime-local" value={form.dateTime} onChange={(e) => set('dateTime', e.target.value)} />
        {err('dateTime')}
      </div>

      <div className={`field${errors.status ? ' bad' : ''}`}>
        <span className="label">Status</span>
        <StatusControl name="form-status" label="Status" value={form.status} onChange={(s: Status) => set('status', s)} describedBy={errors.status ? 'status-err' : undefined} />
        {err('status')}
      </div>

      <button className="primary" type="submit" disabled={saving}>
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Add appointment'}
      </button>
      {editing && <button type="button" className="ghost wide" onClick={onCancel}>Cancel</button>}
    </form>
  );
}
