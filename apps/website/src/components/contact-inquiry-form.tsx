"use client";

import { FormEvent, useState } from "react";

const initial = {
  fullName: "",
  email: "",
  phoneNumber: "",
  inquiryType: "Customer inquiry",
  message: ""
};

export function ContactInquiryForm() {
  const [form, setForm] = useState(initial);
  const [notice, setNotice] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Your inquiry has been received. KariGO will contact you with the next steps.");
  }

  return (
    <form className="form-card inquiry-form" onSubmit={submit}>
      <h2>Send an inquiry</h2>
      <p>Use this form to prepare a customer, vendor, rider, driver or business inquiry. Do not include passwords, OTPs, payment details or sensitive private information.</p>
      <div className="form-grid">
        <label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
        <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Phone number optional<input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} /></label>
        <label>Inquiry type<select value={form.inquiryType} onChange={(event) => setForm({ ...form, inquiryType: event.target.value })}>
          <option>Customer inquiry</option>
          <option>Vendor inquiry</option>
          <option>Rider or driver inquiry</option>
          <option>SME or corporate inquiry</option>
          <option>General inquiry</option>
        </select></label>
      </div>
      <label>Message<textarea required value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
      {notice ? <p className="success" role="status">{notice}</p> : null}
      <button type="submit">Submit Inquiry</button>
    </form>
  );
}
