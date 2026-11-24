export type DealerStatus = "draft" | "pending_review" | "under_review" | "approved" | "rejected" | "suspended";

export type DealerDocType =
  | "trade_licence"
  | "trn_certificate"
  | "emirates_id_front"
  | "emirates_id_back"
  | "dl_front"
  | "dl_back";

export interface DealerApplicationFields {
  business_name: string | null;
  business_type: string | null;
  trade_licence_number: string | null;
  trade_licence_expiry: string | null;
  trn: string | null;
  business_email: string | null;
  business_phone: string | null;
  whatsapp_number: string | null;
  owner_name: string | null;
  owner_id_type: "emirates_id" | "driving_licence" | null;
  owner_id_number: string | null;
  address_line: string | null;
  emirate: string | null;
  city: string | null;
  area: string | null;
  po_box: string | null;
  map_url: string | null;
  latitude: string | null;
  longitude: string | null;
  notes: string | null;
}

export interface DealerDocumentMeta {
  id: number;
  doc_type: DealerDocType;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at?: string;
  created_at?: string;
}

export interface DealerSummary {
  status: DealerStatus;
  dealer_code: string | null;
  is_active: boolean;
  wholesale: boolean;
  not_yet_active: boolean;
  expired: boolean;
}

/** GET /account/dealer */
export interface MyDealerApplication {
  id: number;
  status: DealerStatus;
  dealer: DealerSummary;
  editable: boolean;
  allow_resubmission: boolean;
  rejection_reason: string | null;
  info_request_message: string | null;
  suspension_reason: string | null;
  submitted_at: string | null;
  application: DealerApplicationFields;
  documents: DealerDocumentMeta[];
  credit: {
    credit_enabled: boolean;
    credit_limit: string;
    credit_period_days: number;
    payment_terms: string | null;
  } | null;
}

/** GET /partner/info */
export interface PartnerInfo {
  registration_enabled: boolean;
  terms_html: string;
  max_document_mb: number;
  business_types: string[];
  emirates: string[];
}

/** Which documents an application needs, given the chosen ID type and whether a TRN is entered. */
export function requiredDocTypes(idType: string | null | undefined, hasTrn: boolean): DealerDocType[] {
  const docs: DealerDocType[] = ["trade_licence"];
  if (idType === "driving_licence") docs.push("dl_front", "dl_back");
  else docs.push("emirates_id_front", "emirates_id_back");
  if (hasTrn) docs.push("trn_certificate");
  return docs;
}

/* ---------- Admin ---------- */

export interface AdminDealerListItem {
  id: number;
  status: DealerStatus;
  dealer_code: string | null;
  business_name: string | null;
  business_type: string | null;
  trade_licence_number: string | null;
  business_email: string | null;
  business_phone: string | null;
  emirate: string | null;
  city: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  user_id: number;
  user_name: string;
  user_email: string;
  credit_enabled: number | null;
  credit_limit: string | null;
  credit_period_days: number | null;
}

export interface AdminDealerList {
  items: AdminDealerListItem[];
  meta: { total: number; current_page: number; per_page: number; total_pages: number };
  counts: Partial<Record<DealerStatus, number>>;
}

export interface AdminDealerCredit {
  dealer_profile_id: number;
  credit_enabled: number;
  credit_limit: string;
  credit_period_days: number;
  payment_terms: string | null;
  outstanding_balance: string;
  reserved_amount: string;
  updated_at: string;
}

export interface AdminDealerDetail {
  profile: Omit<DealerApplicationFields, "owner_id_number"> & {
    id: number;
    user_id: number;
    status: DealerStatus;
    dealer_code: string | null;
    owner_id_number: string | null;
    owner_id_number_masked: string | null;
    owner_id_last4: string | null;
    wholesale_enabled: number;
    requires_quotation: number;
    force_quotation: number;
    activated_at: string | null;
    expires_at: string | null;
    allow_resubmission: number;
    rejection_reason: string | null;
    info_request_message: string | null;
    suspension_reason: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  user: { id: number; name: string; email: string; phone: string | null; created_at: string } | null;
  reviewer: { id: number; name: string } | null;
  documents: DealerDocumentMeta[];
  can_view_documents: boolean;
  history: { id: number; from_status: string | null; to_status: string; reason: string | null; created_at: string; changed_by_name: string | null }[];
  notes: { id: number; text: string; author: string | null; created_at: string }[];
  credit: AdminDealerCredit | null;
  suggested_dealer_code: string;
  defaults: { credit_enabled: boolean; credit_period_days: number };
}

export const DEALER_STATUS_LABEL: Record<DealerStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const DOC_TYPE_LABEL: Record<DealerDocType, string> = {
  trade_licence: "Trade licence",
  trn_certificate: "TRN certificate",
  emirates_id_front: "Emirates ID (front)",
  emirates_id_back: "Emirates ID (back)",
  dl_front: "Driving licence (front)",
  dl_back: "Driving licence (back)",
};

export const BUSINESS_TYPE_LABEL: Record<string, string> = {
  spare_parts_shop: "Spare parts shop",
  garage: "Garage / workshop",
  fleet_operator: "Fleet operator",
  car_dealer: "Car dealer",
  other: "Other",
};
