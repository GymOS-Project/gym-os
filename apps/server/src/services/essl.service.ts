import { supabase } from "../supabase";

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseDateTime(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const candidate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)
    ? normalized.replace(" ", "T")
    : normalized;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function normalizeEsslPayload(payload: Record<string, unknown>) {
  const serialNumber = normalizeString(payload.SN) || normalizeString(payload.sn) || normalizeString(payload.serial_number);
  const userCode = normalizeString(payload.PIN) || normalizeString(payload.pin) || normalizeString(payload.user_id) || normalizeString(payload.userid);
  const punchAt = parseDateTime(payload.DateTime) || parseDateTime(payload.datetime) || parseDateTime(payload.punch_at) || new Date().toISOString();

  return { serialNumber, userCode, punchAt };
}

export function parseAdmsAttendanceBody(body: string) {
  return body
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [userCodeRaw, punchAtRaw, status, verifyMode, workCode] = line.split("\t");
      return {
        userCode: normalizeString(userCodeRaw),
        punchAt: parseDateTime(punchAtRaw) || new Date().toISOString(),
        status: normalizeString(status),
        verifyMode: normalizeString(verifyMode),
        workCode: normalizeString(workCode),
        rawLine: line,
      };
    })
    .filter((entry) => entry.userCode);
}

export function buildAdmsHandshakeResponse(serialNumber: string | null) {
  const now = Math.floor(Date.now() / 1000);
  const lines = [
    `GET OPTION FROM: ${serialNumber || "UNKNOWN"}`,
    "Stamp=9999",
    `OpStamp=${now}`,
    "ErrorDelay=60",
    "Delay=30",
    "ResLogDay=18250",
    "ResLogDelCount=10000",
    "ResLogCount=50000",
    "TransTimes=00:00;14:05",
    "TransInterval=1",
    "TransFlag=1111000000",
    "Realtime=1",
    "Encrypt=0",
    "TimeZone=330",
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export async function resolveEsslIdentity(params: {
  adminId: string | null;
  gymId: string | null;
  userCode: string | null;
}) {
  const { adminId, gymId, userCode } = params;
  if (!adminId || !gymId || !userCode) {
    return { memberId: null, staffId: null };
  }

  const [memberResult, staffResult] = await Promise.all([
    supabase
      .from("members")
      .select("id")
      .eq("admin_id", adminId)
      .eq("gym_id", gymId)
      .eq("external_user_code", userCode)
      .maybeSingle(),
    supabase
      .from("staff_accounts")
      .select("id")
      .eq("admin_id", adminId)
      .eq("gym_id", gymId)
      .eq("external_user_code", userCode)
      .maybeSingle(),
  ]);

  return {
    memberId: memberResult.data?.id ? String(memberResult.data.id) : null,
    staffId: staffResult.data?.id ? String(staffResult.data.id) : null,
  };
}

export async function createAttendanceFromEsslPunch(params: {
  adminId: string | null;
  gymId: string | null;
  memberId: string | null;
  staffId: string | null;
  punchAt: string;
  externalPunchId: string | null;
}) {
  const { adminId, gymId, memberId, staffId, punchAt, externalPunchId } = params;
  if (!adminId || !gymId || (!memberId && !staffId)) {
    return null;
  }

  const attendanceDate = punchAt.slice(0, 10);
  const entityType = memberId ? "member" : "staff";
  const idColumn = memberId ? "member_id" : "staff_account_id";
  const idValue = memberId || staffId;

  let existingQuery = supabase
    .from("attendance_logs")
    .select("*")
    .eq("admin_id", adminId)
    .eq("gym_id", gymId)
    .eq("entity_type", entityType)
    .eq(idColumn, idValue)
    .eq("attendance_date", attendanceDate)
    .order("created_at", { ascending: false })
    .limit(1);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data && !existing.data.check_out_at) {
    const update = await supabase
      .from("attendance_logs")
      .update({
        check_out_at: punchAt,
        external_punch_id: externalPunchId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id)
      .eq("admin_id", adminId)
      .select("*")
      .single();

    if (update.error) {
      throw new Error(update.error.message);
    }

    return update.data;
  }

  const insert = await supabase
    .from("attendance_logs")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      entity_type: entityType,
      member_id: memberId,
      staff_account_id: staffId,
      attendance_date: attendanceDate,
      check_in_at: punchAt,
      source: "essl",
      status: "present",
      external_punch_id: externalPunchId,
    })
    .select("*")
    .single();

  if (insert.error) {
    throw new Error(insert.error.message);
  }

  return insert.data;
}

export async function ingestEsslPunch(payload: Record<string, unknown>) {
  const normalized = normalizeEsslPayload(payload);

  const deviceLookup = normalized.serialNumber
    ? await supabase.from("essl_devices").select("*").eq("serial_number", normalized.serialNumber).maybeSingle()
    : { data: null, error: null as any };

  if (deviceLookup.error) {
    throw new Error(deviceLookup.error.message);
  }

  const device = deviceLookup.data;
  const resolvedIdentity = await resolveEsslIdentity({
    adminId: device?.admin_id ? String(device.admin_id) : null,
    gymId: device?.gym_id ? String(device.gym_id) : null,
    userCode: normalized.userCode,
  });

  const insert = await supabase
    .from("essl_raw_punch_logs")
    .insert({
      admin_id: device?.admin_id || null,
      gym_id: device?.gym_id || null,
      essl_device_id: device?.id || null,
      serial_number: normalized.serialNumber,
      user_code: normalized.userCode,
      punch_at: normalized.punchAt,
      payload,
      processing_status: resolvedIdentity.memberId || resolvedIdentity.staffId ? "mapped" : "received",
      resolved_member_id: resolvedIdentity.memberId,
      resolved_staff_id: resolvedIdentity.staffId,
    })
    .select("*")
    .single();

  if (insert.error) {
    throw new Error(insert.error.message);
  }

  if (device?.id) {
    await supabase
      .from("essl_devices")
      .update({
        last_synced_at: new Date().toISOString(),
        status: "online",
        updated_at: new Date().toISOString(),
      })
      .eq("id", device.id);
  }

  if (device?.admin_id && device?.gym_id) {
    await createAttendanceFromEsslPunch({
      adminId: String(device.admin_id),
      gymId: String(device.gym_id),
      memberId: resolvedIdentity.memberId,
      staffId: resolvedIdentity.staffId,
      punchAt: normalized.punchAt,
      externalPunchId: insert.data.id,
    });
  }

  return {
    normalized,
    device,
    resolvedIdentity,
    rawLog: insert.data,
  };
}
