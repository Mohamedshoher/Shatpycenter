// ملف Deno Edge Function خارج مشروع Next.js (معزول عن tsconfig)
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "npm:@supabase/supabase-js@2";

// =========================================================================
// Edge Function: messaging
// البوابة الأمنية الوحيدة لنظام المراسلة الداخلية.
// يتحقق من هوية المتصل (مدير / مدرس / ولي أمر) عبر توكن موقّع HMAC يُصدر
// عند تسجيل الدخول، ثم ينفّذ العمليات باستخدام service_role مع فرض
// فحوصات المشاركة في الكود قبل أي وصول.
// =========================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MESSAGING_SECRET = Deno.env.get("MESSAGING_SECRET") || "shatibi-messaging-secret";
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ------------------------- أدوات JWT (HS256) -----------------------------
function b64urlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): string {
  let b = input.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4 !== 0) b += "=";
  return atob(b);
}

async function hmacKey() {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(MESSAGING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: Record<string, unknown>): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64urlEncode(new Uint8Array(sig))}`;
}

async function verifyToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  try {
    const key = await hmacKey();
    const sigBytes = Uint8Array.from(b64urlDecode(s), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(`${h}.${p}`),
    );
    if (!valid) return null;
    const payload = JSON.parse(b64urlDecode(p));
    if (typeof payload.actor !== "string") return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.actor;
  } catch {
    return null;
  }
}

// ------------------------- أدوات الهوية --------------------------------
type ActorKind = "director" | "teacher" | "parent";

function parseActor(actor: string): { kind: ActorKind; id: string } {
  if (actor === "director:main") return { kind: "director", id: "main" };
  if (actor.startsWith("teacher:")) return { kind: "teacher", id: actor.slice("teacher:".length) };
  if (actor.startsWith("parent:")) return { kind: "parent", id: actor.slice("parent:".length) };
  throw new Error("bad actor");
}

async function resolveName(actor: string): Promise<{ name: string; role: string }> {
  const { kind, id } = parseActor(actor);
  if (kind === "director") return { name: "إدارة المركز", role: "director" };
  if (kind === "teacher") {
    const { data } = await supabase
      .from("teachers")
      .select("full_name")
      .eq("id", id)
      .maybeSingle();
    return { name: data?.full_name || "مدرس", role: "teacher" };
  }
  return { name: id, role: "parent" };
}

async function getConversation(conversationId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ------------------------- المصادقة (إصدار التوكن) -----------------------
async function handleToken(body: any) {
  let actor = body.actor;
  const passcode = body.passcode;
  if (typeof actor !== "string" || typeof passcode !== "string") {
    return json({ error: "actor and passcode required" }, 400);
  }

  const { kind, id } = parseActor(actor);

  if (kind === "director") {
    if (passcode !== "996644") return json({ error: "invalid credentials" }, 401);
  } else if (kind === "teacher") {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, password")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return json({ error: "teacher not found" }, 401);
    // مطابقة سلوك تسجيل الدخول الحالي: المدرس بدون كلمة مرور مسجل، يُسمح بأي كلمة
    if (data.password && data.password !== passcode) {
      return json({ error: "invalid credentials" }, 401);
    }
  } else if (kind === "parent") {
    const { data, error } = await supabase
      .from("students")
      .select("parent_phone")
      .or(`parent_phone.eq.${id},parent_phone.eq.02${id}`)
      .limit(1);
    if (error || !data || data.length === 0) {
      return json({ error: "parent not found" }, 401);
    }
    const dbPhone = data[0].parent_phone || id;
    const last6 = dbPhone.slice(-6);
    if (passcode !== last6 && passcode !== "123456") {
      return json({ error: "invalid credentials" }, 401);
    }
    actor = `parent:${dbPhone}`; // المعرّف المتعارف عليه كما هو مخزّن
  }

  const token = await signPayload({
    actor,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
  return json({ token, actor });
}

// ------------------------- قائمة المحادثات -------------------------------
async function handleList(actor: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .contains("participants", [actor]);
  if (error) throw error;

  const conversations = (data || []).sort((a: any, b: any) => {
    const ta = a.last_message_at || a.created_at;
    const tb = b.last_message_at || b.created_at;
    return String(tb).localeCompare(String(ta));
  });

  return json({ conversations });
}

// ------------------------- الرسائل ----------------------------------------
async function handleMessages(actor: string, conversationId: string) {
  const conv = await getConversation(conversationId);
  if (!conv || !conv.participants.includes(actor)) {
    return json({ error: "forbidden" }, 403);
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return json({ messages: data || [] });
}

// ------------------------- إنشاء محادثة -----------------------------------
async function handleCreate(actor: string, body: any) {
  const { other } = body;
  if (typeof other !== "string") return json({ error: "other required" }, 400);

  let otherKind: ActorKind;
  try {
    otherKind = parseActor(other).kind;
  } catch {
    return json({ error: "bad other actor" }, 400);
  }

  const myKind = parseActor(actor).kind;

  let type: string;
  if (myKind === "director") {
    type = otherKind === "teacher" ? "director-teacher" : "director-parent";
  } else if (myKind === "teacher") {
    type = otherKind === "teacher" ? "teacher-teacher" : "teacher-parent";
  } else {
    // ولي الأمر: لا يمكنه بدء محادثة إلا مع مدرس أبنائه أو الإدارة
    if (otherKind === "director") type = "director-parent";
    else if (otherKind === "teacher") type = "teacher-parent";
    else return json({ error: "parent-parent forbidden" }, 403);
  }

  if (!["director-teacher", "director-parent", "teacher-teacher", "teacher-parent"].includes(type)) {
    return json({ error: "invalid type" }, 400);
  }

  // التحقق من الرابط الفعلي لحالة teacher-parent
  if (type === "teacher-parent") {
    const { data: allowed, error: rpcError } = await supabase.rpc("is_conversation_allowed", {
      p_participants: [actor, other],
      p_type: type,
    });
    if (rpcError) throw rpcError;
    if (!allowed) return json({ error: "conversation not allowed" }, 403);
  }

  const participants = [actor, other];
  const [me, them] = await Promise.all([resolveName(actor), resolveName(other)]);
  const participant_names = participants.map((p) => (p === actor ? me.name : them.name));

  // البحث عن محادثة موجودة بين نفس الطرفين
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .contains("participants", [actor])
    .contains("participants", [other]);
  if (existing && existing.length > 0) {
    return json({ conversation: existing[0] });
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      participants,
      participant_names,
      type,
      unread_counts: {},
      last_message: null,
      last_message_at: null,
    })
    .select()
    .single();
  if (error) throw error;

  return json({ conversation: data });
}

// ------------------------- إرسال رسالة ------------------------------------
async function handleSend(actor: string, body: any) {
  const { conversationId, content } = body;
  if (typeof conversationId !== "string" || typeof content !== "string" || !content.trim()) {
    return json({ error: "conversationId and content required" }, 400);
  }

  const conv = await getConversation(conversationId);
  if (!conv || !conv.participants.includes(actor)) {
    return json({ error: "forbidden" }, 403);
  }

  const { name, role } = await resolveName(actor);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: actor,
      sender_name: name,
      sender_role: role,
      content: content.trim(),
      read_by: [],
      is_pinned: false,
    })
    .select()
    .single();
  if (error) throw error;

  return json({ message: data });
}

// ------------------------- تعليم كمقروء -----------------------------------
async function handleMarkRead(actor: string, conversationId: string) {
  const conv = await getConversation(conversationId);
  if (!conv || !conv.participants.includes(actor)) {
    return json({ error: "forbidden" }, 403);
  }

  await supabase
    .from("conversations")
    .update({ unread_counts: { ...(conv.unread_counts || {}), [actor]: 0 } })
    .eq("id", conversationId);

  await supabase.rpc("mark_messages_read", {
    p_conversation_id: conversationId,
    p_actor: actor,
  });

  return json({ ok: true });
}

// ------------------------- تثبيت رسالة ------------------------------------
async function handlePin(actor: string, body: any) {
  const { conversationId, messageId, pin } = body;
  if (typeof conversationId !== "string" || typeof messageId !== "string") {
    return json({ error: "conversationId and messageId required" }, 400);
  }

  const conv = await getConversation(conversationId);
  if (!conv || !conv.participants.includes(actor)) {
    return json({ error: "forbidden" }, 403);
  }

  const { data, error } = await supabase
    .from("messages")
    .update({ is_pinned: !!pin })
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .select()
    .single();
  if (error) throw error;

  return json({ message: data });
}

// ------------------------- قائمة جهات الاتصال ------------------------------
async function handleContacts(actor: string) {
  const { kind, id } = parseActor(actor);

  if (kind === "director") {
    const { data: teachers } = await supabase
      .from("teachers")
      .select("id, full_name, phone")
      .order("full_name");
    const { data: students } = await supabase
      .from("students")
      .select("parent_phone, full_name, status")
      .not("parent_phone", "is", null);
    const seen = new Set<string>();
    const parents: any[] = [];
    for (const s of students || []) {
      if (!s.parent_phone || seen.has(s.parent_phone)) continue;
      seen.add(s.parent_phone);
      parents.push({
        id: `parent:${s.parent_phone}`,
        name: s.full_name,
        phone: s.parent_phone,
        kind: "parent",
      });
    }
    return json({
      teachers: (teachers || []).map((t: any) => ({
        id: `teacher:${t.id}`,
        name: t.full_name,
        phone: t.phone || "",
        kind: "teacher",
      })),
      parents,
    });
  }

  if (kind === "teacher") {
    const { data: colleagues } = await supabase
      .from("teachers")
      .select("id, full_name, phone")
      .neq("id", id)
      .order("full_name");
    const { data: tpa } = await supabase
      .from("teacher_parent_access")
      .select("parent_phone, student_name")
      .eq("teacher_id", id);
    const seen = new Set<string>();
    const parents: any[] = [];
    for (const row of tpa || []) {
      if (seen.has(row.parent_phone)) continue;
      seen.add(row.parent_phone);
      parents.push({
        id: `parent:${row.parent_phone}`,
        name: row.student_name ? `وليّ أمر ${row.student_name}` : row.parent_phone,
        phone: row.parent_phone,
        kind: "parent",
      });
    }
    return json({
      teachers: (colleagues || []).map((t: any) => ({
        id: `teacher:${t.id}`,
        name: t.full_name,
        phone: t.phone || "",
        kind: "teacher",
      })),
      parents,
    });
  }

  // ولي الأمر: مدرسو أبنائه فقط
  const { data: tpa } = await supabase
    .from("teacher_parent_access")
    .select("teacher_id, student_name")
    .eq("parent_phone", id);
  const seen = new Set<string>();
  const teachers: any[] = [];
  for (const row of tpa || []) {
    if (seen.has(row.teacher_id)) continue;
    seen.add(row.teacher_id);
    const { data: t } = await supabase
      .from("teachers")
      .select("id, full_name, phone")
      .eq("id", row.teacher_id)
      .maybeSingle();
    if (t) {
      teachers.push({
        id: `teacher:${t.id}`,
        name: t.full_name,
        phone: t.phone || "",
        kind: "teacher",
      });
    }
  }
  return json({ teachers, parents: [] });
}

// ------------------------- نقطة الدخول ------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid body" }, 400);
  }

  const { action } = body;

  try {
    if (action === "token") {
      return await handleToken(body);
    }

    // باقي العمليات تتطلب توكن ساري المفعول
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const actor = await verifyToken(token);
    if (!actor) return json({ error: "unauthorized" }, 401);

    switch (action) {
      case "list":
        return await handleList(actor);
      case "messages":
        return await handleMessages(actor, body.conversationId);
      case "create":
        return await handleCreate(actor, body);
      case "send":
        return await handleSend(actor, body);
      case "markRead":
        return await handleMarkRead(actor, body.conversationId);
      case "pin":
        return await handlePin(actor, body);
      case "contacts":
        return await handleContacts(actor);
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (err) {
    console.error("messaging error", err);
    return json({ error: "internal error" }, 500);
  }
});
