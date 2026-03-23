/**
 * Common IANA timezones for organization settings.
 * DB stores UTC; these are used for display (invoices, audit, reports).
 */
export const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Karachi", label: "Pakistan (PKT)" },
  { value: "Asia/Dhaka", label: "Bangladesh (BST)" },
  { value: "Asia/Kathmandu", label: "Nepal (NPT)" },
  { value: "Asia/Riyadh", label: "Riyadh (AST)" },
  { value: "Asia/Qatar", label: "Qatar (AST)" },
  { value: "Asia/Bahrain", label: "Bahrain (AST)" },
  { value: "Asia/Kuwait", label: "Kuwait (AST)" },
  { value: "Asia/Muscat", label: "Muscat (GST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
];
