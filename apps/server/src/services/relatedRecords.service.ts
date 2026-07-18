import { supabase } from "../supabase";

type WithMemberId = {
  member_id: string | null;
};

type WithEnquiryId = {
  enquiry_id: string | null;
};

type MemberSummary = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  shift?: string | null;
};

type EnquirySummary = {
  id: string;
  name: string;
  phone: string;
  status: string;
};

export async function attachMembersByMemberId<T extends WithMemberId>(
  records: T[],
  fields = "id, name, phone",
) {
  const memberIds = Array.from(
    new Set(records.map((record) => record.member_id).filter((memberId): memberId is string => Boolean(memberId))),
  );

  if (memberIds.length === 0) {
    return records.map((record) => ({ ...record, members: null }));
  }

  const { data, error } = await supabase
    .from("members")
    .select(fields)
    .in("id", memberIds);

  if (error) {
    throw new Error(error.message);
  }

  const memberMap = new Map<string, MemberSummary>();
  for (const member of ((data || []) as unknown as MemberSummary[])) {
    memberMap.set(member.id, member);
  }

  return records.map((record) => ({
    ...record,
    members: record.member_id ? memberMap.get(record.member_id) || null : null,
  }));
}

export async function attachEnquiriesByEnquiryId<T extends WithEnquiryId>(records: T[]) {
  const enquiryIds = Array.from(
    new Set(records.map((record) => record.enquiry_id).filter((enquiryId): enquiryId is string => Boolean(enquiryId))),
  );

  if (enquiryIds.length === 0) {
    return records.map((record) => ({ ...record, enquiries: null }));
  }

  const { data, error } = await supabase
    .from("enquiries")
    .select("id, name, phone, status")
    .in("id", enquiryIds);

  if (error) {
    throw new Error(error.message);
  }

  const enquiryMap = new Map<string, EnquirySummary>();
  for (const enquiry of ((data || []) as unknown as EnquirySummary[])) {
    enquiryMap.set(enquiry.id, enquiry);
  }

  return records.map((record) => ({
    ...record,
    enquiries: record.enquiry_id ? enquiryMap.get(record.enquiry_id) || null : null,
  }));
}
