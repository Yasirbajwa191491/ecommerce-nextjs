export type TrackByOrderForm = {
  orderNumber: string;
};

export type TrackByCustomerForm = {
  email?: string;
  phone?: string;
};

export type TrackByOrderErrors = Partial<Record<keyof TrackByOrderForm, string>>;
export type TrackByCustomerErrors = Partial<
  Record<keyof TrackByCustomerForm | "form", string>
>;

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateTrackByOrderForm(
  form: TrackByOrderForm
): TrackByOrderErrors {
  const errors: TrackByOrderErrors = {};
  const orderNumber = form.orderNumber.trim();

  if (!orderNumber) {
    errors.orderNumber = "Order number is required";
  }

  return errors;
}

export function validateTrackByCustomerForm(
  form: TrackByCustomerForm
): TrackByCustomerErrors {
  const errors: TrackByCustomerErrors = {};
  const email = (form.email ?? "").trim();
  const phone = (form.phone ?? "").trim();

  if (!email && !phone) {
    errors.form = "Enter your email address or phone number";
    return errors;
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (phone && phone.replace(/\D/g, "").length < 8) {
    errors.phone = "Enter a valid phone number";
  }

  return errors;
}

export function hasTrackByOrderErrors(errors: TrackByOrderErrors) {
  return Object.keys(errors).length > 0;
}

export function hasTrackByCustomerErrors(errors: TrackByCustomerErrors) {
  return Object.keys(errors).length > 0;
}
