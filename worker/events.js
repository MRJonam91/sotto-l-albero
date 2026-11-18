import {
  id,
  token,
  validEmail,
  optionalPhone,
  safeText,
  safeUrl,
  HttpError,
  json,
  escapeHtml,
} from "./security.js";
import { first, all, run, sendMail } from "./auth.js";
import { matchParticipants } from "./matching.js";
import { registrationNotice } from "./notifications.js";
import { archiveCompetition } from "./competition.js";
import {
  checkRiddleGuess,
  computeHolidayPortrait,
  holidayIconMap,
  parseHolidayProfile,
} from "../shared/holidayPortrait.js";
import { telegramAvailable, telegramMessage } from "./telegram.js";
const nowIso = () => new Date().toISOString();
const stmt = (db, sql, ...args) => db.prepare(sql).bind(...args);
const audit = (db, eventId, userId, action) =>
  stmt(
    db,
    "INSERT INTO audit(id,event_id,actor_id,action,created_at) VALUES(?,?,?,?,?)",
    id(),
    eventId,
    userId,
    action,
    nowIso(),
  );
function outputEvent(e, user, count) {
  return {
    id: e.id,
    name: e.name,
    budget: e.budget,
    description: e.description,
    closeAt: e.close_at,
    drawAt: e.draw_at,
    giftAt: e.gift_at,
    status: e.status,
    version: e.version,
    historyDepth: e.history_depth,
    isAdmin: e.owner_id === user.id,
    membership: e.membership ?? null,
    groupName: e.group_name,
    memberCount: count,
    error: e.error,
    ...(e.owner_id === user.id ? { inviteToken: e.invite_token } : {}),
  };
}
function mutable(e) {
  if (e.status !== "open")
    throw new HttpError(
      "L’estrazione è già avvenuta. Per cambiare i partecipanti o le regole, annullala prima.",
      409,
    );
}
export async function getEvent(db, eid, user) {
  const e = await first(
    db,
    "SELECT e.*,g.name AS group_name FROM events e JOIN groups g ON g.id=e.group_id WHERE e.id=?",
    eid,
  );
  if (!e) throw new HttpError("Non abbiamo trovato questo evento.", 404);
  const member = await first(
    db,
    "SELECT * FROM members WHERE event_id=? AND user_id=? AND status!='removed'",
    eid,
    user.id,
  );
  if (e.owner_id !== user.id && !member)
    throw new HttpError("Questo evento è riservato ai suoi partecipanti.", 403);
  return { e, member, admin: e.owner_id === user.id };
}
function dates(body) {
  const values = ["closeAt", "drawAt", "giftAt"].map((k) => new Date(body[k]));
  if (
    values.some((d) => !Number.isFinite(d.valueOf())) ||
    values[0] > values[1] ||
    values[1] > values[2]
  )
    throw new HttpError(
      "Controlla le date: prima si chiudono le iscrizioni, poi si estrae e infine si scambiano i regali.",
    );
  return values.map((d) => d.toISOString());
}
export async function createEvent(db, user, body, groupId) {
  const name = safeText(body.name, 100, true),
    description = safeText(body.description, 2000),
    groupName = safeText(body.groupName, 100) || name;
  const budget = Number(body.budget);
  if (!Number.isFinite(budget) || budget < 0 || budget > 10000)
    throw new HttpError("Indica un budget compreso tra 0 e 10.000 euro.");
  const historyDepth = body.historyDepth ?? 1;
  if (!Number.isInteger(historyDepth) || historyDepth < 0 || historyDepth > 10)
    throw new HttpError("Scegli da 0 a 10 edizioni precedenti da escludere.");
  const [close, draw, gift] = dates(body),
    eid = id(),
    gid = groupId || id();
  const batch = [];
  if (!groupId)
    batch.push(
      stmt(
        db,
        "INSERT INTO groups(id,owner_id,name) VALUES(?,?,?)",
        gid,
        user.id,
        groupName,
      ),
    );
  batch.push(
    stmt(
      db,
      "INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at,history_depth) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      eid,
      user.id,
      gid,
      name,
      budget,
      description,
      close,
      draw,
      gift,
      token(),
      nowIso(),
      historyDepth,
    ),
  );
  if (body.organizerParticipates === true)
    batch.push(
      stmt(
        db,
        "INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES(?,?,?,'approved',?)",
        id(),
        eid,
        user.id,
        nowIso(),
      ),
    );
  await db.batch(batch);
  return first(
    db,
    "SELECT e.*,g.name AS group_name FROM events e JOIN groups g ON g.id=e.group_id WHERE e.id=?",
    eid,
  );
}
export async function historicalRules(db, e, members) {
  const byEmail = new Map(members.map((m) => [m.email, m.id]));
  const manual = await all(
    db,
    "SELECT giver_email,receiver_email FROM history WHERE group_id=?",
    e.group_id,
  );
  const old = await all(
    db,
    "SELECT ug.email AS giver_email,ur.email AS receiver_email FROM assignments a JOIN events old ON old.id=a.event_id AND old.version=a.version JOIN members mg ON mg.id=a.giver_id JOIN users ug ON ug.id=mg.user_id JOIN members mr ON mr.id=a.receiver_id JOIN users ur ON ur.id=mr.user_id WHERE old.id IN (SELECT id FROM events WHERE group_id=? AND id!=? AND status IN ('drawn','archived') AND EXISTS(SELECT 1 FROM assignments a2 WHERE a2.event_id=events.id AND a2.version=events.version) ORDER BY created_at DESC,id DESC LIMIT ?)",
    e.group_id,
    e.id,
    e.history_depth ?? 1,
  );
  return manual
    .concat(old)
    .filter((x) => byEmail.has(x.giver_email) && byEmail.has(x.receiver_email))
    .map((x) => ({
      giverId: byEmail.get(x.giver_email),
      receiverId: byEmail.get(x.receiver_email),
      type: "exclude",
    }));
}
export async function drawEvent(env, e, actor = "scheduler") {
  if (e.status === "drawn") return;
  mutable(e);
  const db = env.DB,
    members = await all(
      db,
      "SELECT m.*,u.email FROM members m JOIN users u ON u.id=m.user_id WHERE m.event_id=? AND m.status='approved'",
      e.id,
    );
  const rules = await all(
    db,
    "SELECT giver_id AS giverId,receiver_id AS receiverId,type FROM rules WHERE event_id=?",
    e.id,
  );
  const pairs = matchParticipants(
    members.map((x) => x.id),
    rules.concat(await historicalRules(db, e, members)),
  );
  const version = e.version + 1,
    claim = token();
  const batch = [
    stmt(
      db,
      "UPDATE events SET status='drawn',version=?,draw_token=?,error=NULL WHERE id=? AND version=? AND status='open'",
      version,
      claim,
      e.id,
      e.version,
    ),
  ];
  for (const p of pairs)
    batch.push(
      stmt(
        db,
        "INSERT INTO assignments(event_id,version,giver_id,receiver_id) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=? AND status='drawn')",
        e.id,
        version,
        p.giverId,
        p.receiverId,
        e.id,
        claim,
      ),
    );
  for (const m of members)
    batch.push(
      stmt(
        db,
        "INSERT OR IGNORE INTO outbox(id,event_id,version,email,subject,html) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=? AND status='drawn') AND EXISTS(SELECT 1 FROM users WHERE email=? AND notify_email=1)",
        id(),
        e.id,
        version,
        m.email,
        `La tua lettera per ${e.name} è pronta`,
        `<p>Abbiamo estratto i nomi per <strong>${escapeHtml(e.name)}</strong>.</p><p><a href="${escapeHtml(env.APP_URL || "")}/events/${e.id}?tab=reveal">Apri la tua lettera</a> e scopri per chi preparerai il regalo.</p>`,
        e.id,
        claim,
        m.email,
      ),
    );
  batch.push(
    stmt(
      db,
      "INSERT INTO audit(id,event_id,actor_id,action,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=?)",
      id(),
      e.id,
      actor,
      "draw",
      nowIso(),
      e.id,
      claim,
    ),
  );
  const result = await db.batch(batch);
  if (result[0].meta.changes !== 1) {
    const latest = await first(
      db,
      "SELECT status FROM events WHERE id=?",
      e.id,
    );
    if (latest?.status !== "drawn")
      throw new HttpError(
        "L’evento è cambiato durante l’estrazione. Riprova.",
        409,
      );
  }
}
export async function eventRoute(request, env, path, body, user) {
  const db = env.DB,
    method = request.method;
  if (path === "/api/events") {
    if (method === "GET") {
      const rows = await all(
        db,
        "SELECT DISTINCT e.*,g.name AS group_name,m.status AS membership,(SELECT COUNT(*) FROM members x WHERE x.event_id=e.id AND x.status='approved') AS member_count FROM events e JOIN groups g ON g.id=e.group_id LEFT JOIN members m ON m.event_id=e.id AND m.user_id=? AND m.status!='removed' WHERE e.owner_id=? OR m.id IS NOT NULL ORDER BY e.created_at DESC",
        user.id,
        user.id,
      );
      return json({
        events: rows.map((e) => outputEvent(e, user, e.member_count)),
      });
    }
    if (method === "POST")
      return json(
        {
          event: outputEvent(
            await createEvent(db, user, body),
            user,
            body.organizerParticipates === true ? 1 : 0,
          ),
        },
        201,
      );
  }
  const match = path.match(/^\/api\/events\/([^/]+)(?:\/(.*))?$/);
  if (!match) throw new HttpError("Questa pagina non esiste.", 404);
  const [, eid, action = ""] = match;
  if (action === "join" && method === "POST") {
    const givenToken = safeText(body.token, 100, true);
    const e = await first(
      db,
      "SELECT * FROM events WHERE id=? AND (invite_token=? OR EXISTS(SELECT 1 FROM invites i WHERE i.event_id=events.id AND i.token=? AND i.email=?))",
      eid,
      givenToken,
      givenToken,
      user.email,
    );
    if (!e)
      throw new HttpError(
        "Questo invito non è più valido o le iscrizioni sono chiuse.",
      );
    const existing = await first(
      db,
      "SELECT status FROM members WHERE event_id=? AND user_id=? AND status!='removed'",
      eid,
      user.id,
    );
    if (existing) return json({ ok: true, membership: existing.status });
    if (
      e.owner_id === user.id &&
      (e.status !== "open" || new Date(e.close_at).valueOf() <= Date.now())
    )
      return json({ ok: true, membership: null, isOwner: true });
    if (e.status !== "open" || new Date(e.close_at).valueOf() <= Date.now())
      throw new HttpError(
        "Questo invito non è più valido o le iscrizioni sono chiuse.",
      );
    const joinedAt = Date.now();
    const changed = await db.batch([
      stmt(
        db,
        "INSERT INTO members(id,event_id,user_id,status,updated_at) SELECT ?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND status='open' AND version=? AND close_at>?) AND ((SELECT COUNT(*) FROM members WHERE event_id=? AND status!='removed')<50) ON CONFLICT(event_id,user_id) DO UPDATE SET status='pending',updated_at=excluded.updated_at WHERE members.status='removed'",
        id(),
        eid,
        user.id,
        new Date(joinedAt).toISOString(),
        eid,
        e.version,
        new Date(joinedAt).toISOString(),
        eid,
      ),
      registrationNotice(env, eid, user.id, joinedAt),
    ]);
    const member = await first(
      db,
      "SELECT status FROM members WHERE event_id=? AND user_id=? AND status!='removed'",
      eid,
      user.id,
    );
    if (!changed[0].meta.changes && !member)
      throw new HttpError(
        "Le iscrizioni sono cambiate o il gruppo è al completo.",
        409,
      );
    return json({ ok: true, membership: member?.status ?? "pending" });
  }
  const { e, member, admin } = await getEvent(db, eid, user);
  if (
    method === "POST" &&
    (action === "recipient" || action === "assignments")
  ) {
    const fullList = action === "assignments";
    if (fullList ? !admin : member?.status !== "approved")
      throw new HttpError(
        "Questa lettera non è disponibile per il tuo profilo.",
        403,
      );
    if (fullList && body.confirm !== true)
      throw new HttpError("Conferma che vuoi vedere tutti gli abbinamenti.");
    if (body.version !== e.version || !["drawn", "archived"].includes(e.status))
      throw new HttpError(
        "L’estrazione non è disponibile per questa versione.",
        409,
      );

    if (fullList) {
      const assignments = await all(
        db,
        `SELECT a.giver_id AS giverId,a.receiver_id AS receiverId FROM assignments a
         JOIN events current ON current.id=a.event_id AND current.version=a.version
         WHERE current.id=? AND current.owner_id=? AND current.version=?
         AND current.status IN ('drawn','archived') ORDER BY a.giver_id`,
        eid,
        user.id,
        e.version,
      );
      if (!assignments.length)
        throw new HttpError(
          "Non ci sono abbinamenti per questa versione.",
          409,
        );
      await audit(db, eid, user.id, "view_assignments").run();
      return json({ assignments });
    }

    const recipient = await first(
      db,
      `SELECT u.name,u.nickname,u.badge,u.badge_text AS badgeText,receiver.wishlist FROM assignments a
       JOIN events current ON current.id=a.event_id AND current.version=a.version
       JOIN members giver ON giver.id=a.giver_id AND giver.event_id=current.id AND giver.status='approved'
       JOIN members receiver ON receiver.id=a.receiver_id AND receiver.event_id=current.id AND receiver.status='approved'
       JOIN users u ON u.id=receiver.user_id
       WHERE current.id=? AND giver.user_id=? AND current.version=?
       AND current.status IN ('drawn','archived')`,
      eid,
      user.id,
      e.version,
    );
    if (!recipient)
      throw new HttpError(
        "La lettera non è disponibile per questa versione.",
        409,
      );
    return json({
      recipient: {
        name: recipient.name,
        nickname: recipient.nickname || "",
        badge: recipient.badge || null,
        badgeText: recipient.badgeText || "nickname",
        wishlist: JSON.parse(recipient.wishlist),
      },
    });
  }
  if (action === "" && method === "GET") {
    const members = await all(
      db,
      `SELECT m.id,m.user_id AS userId,u.name,u.nickname,u.badge,u.badge_text AS badgeText,
       u.holiday_profile AS holidayProfileRaw,
       (SELECT COUNT(DISTINCT stamp) FROM user_stamps WHERE user_id=u.id) AS stampsCount,
       (SELECT COUNT(*) FROM competition_attempts WHERE user_id=u.id AND raw_score IS NOT NULL) +
       (SELECT COUNT(*) FROM practice_games WHERE user_id=u.id AND done=1) AS gamesPlayed,
       m.status,m.wishlist,av.kind AS avatar_kind,CASE WHEN av.kind='photo' THEN av.revision ELSE av.preset END AS avatar_value
       FROM members m JOIN users u ON u.id=m.user_id LEFT JOIN user_avatars av ON av.user_id=u.id
       WHERE m.event_id=? AND m.status!='removed' ORDER BY m.updated_at`,
      eid,
    );
    const rules =
      admin && e.status === "open"
        ? await all(
            db,
            "SELECT giver_id AS giverId,receiver_id AS receiverId,type FROM rules WHERE event_id=?",
            eid,
          )
        : [];
    const invites = admin
      ? await all(
          db,
          "SELECT id,email,state,created_at AS createdAt FROM invites WHERE event_id=?",
          eid,
        )
      : [];
    const visibleMembers = admin
      ? members
      : members.filter(
          (m) =>
            m.userId === user.id ||
            (member?.status === "approved" && m.status === "approved"),
        );
    const interactions =
      admin || member?.status === "approved"
        ? await all(
            db,
            `SELECT p.id,p.sender_id AS senderId,s.name AS senderName,s.nickname AS senderNickname,
             p.receiver_id AS receiverId,r.name AS receiverName,p.kind,p.icon,p.message,p.correct,p.created_at AS createdAt
             FROM portrait_interactions p
             JOIN users s ON s.id=p.sender_id
             JOIN users r ON r.id=p.receiver_id
             WHERE p.event_id=?
             ORDER BY p.created_at DESC LIMIT 30`,
            eid,
          )
        : [];
    return json({
      event: outputEvent(
        e,
        user,
        members.filter((x) => x.status === "approved").length,
      ),
      members: visibleMembers.map(
        ({
          wishlist,
          avatar_kind,
          avatar_value,
          nickname,
          badge,
          badgeText,
          holidayProfileRaw,
          stampsCount,
          gamesPlayed,
          ...m
        }) => {
          const canSeePortrait =
            m.status === "approved" || admin || m.userId === user.id;
          const hp = parseHolidayProfile(holidayProfileRaw);
          const computed = canSeePortrait
            ? computeHolidayPortrait(hp, {
                name: m.name,
                nickname,
                badge,
                stampsCount: stampsCount || 0,
                gamesPlayed: gamesPlayed || 0,
              })
            : null;
          return {
            ...m,
            nickname: nickname || "",
            badge: badge || null,
            badgeText: badgeText || "nickname",
            hasWishlist: JSON.parse(wishlist).length > 0,
            ...(avatar_value && canSeePortrait
              ? { avatar: { kind: avatar_kind, value: avatar_value } }
              : {}),
            ...(canSeePortrait
              ? {
                  holidayStatus: {
                    quote: hp.quote,
                    activity: hp.activity,
                    iconMessage: hp.iconMessage,
                    iconCaption: hp.iconCaption,
                    riddle: hp.riddle,
                    riddleHint: hp.riddleHint,
                    hasRiddleAnswer: Boolean(hp.riddleAnswer),
                    answers: hp.answers,
                    portraitApproved: hp.portraitApproved,
                  },
                  portrait: hp.portraitApproved
                    ? {
                        completeness: computed.completeness,
                        confidenceLevel: computed.confidenceLevel,
                        confidencePct: computed.confidencePct,
                        skippedCount: computed.skippedCount,
                        ignoredToday: computed.ignoredToday,
                        finalDescription: computed.finalDescription,
                        tastes: computed.tastes,
                        characterMatches: computed.characterMatches,
                        topCharacter: computed.topCharacter,
                        spiritScene: computed.spiritScene,
                      }
                    : null,
                }
              : {}),
          };
        },
      ),
      portraitInteractions: interactions.map((item) => ({
        ...item,
        correct: !!item.correct,
        // Mask wrong or unverified riddle guesses for everyone except sender and receiver so solutions aren't spoiled
        message:
          item.kind === "riddle_guess" &&
          item.correct &&
          item.senderId !== user.id &&
          item.receiverId !== user.id
            ? "Ha indovinato la soluzione! 🎉"
            : item.message,
      })),
      rules,
      wishlist: member ? JSON.parse(member.wishlist) : [],
      invites,
    });
  }
  if (action === "portrait-interact" && method === "POST") {
    if (!admin && (!member || member.status !== "approved"))
      throw new HttpError(
        "Solo i partecipanti confermati possono interagire nel gruppo.",
        403,
      );
    const targetUserId = safeText(body?.targetUserId, 64, true);
    const kind = body?.kind === "riddle_guess" ? "riddle_guess" : "icon_note";
    const message = safeText(body?.message, 240, true);
    const icon =
      body?.icon && holidayIconMap.has(body.icon) ? body.icon : "🎄";
    const targetMember = await first(
      db,
      `SELECT u.id,u.name,u.nickname,u.email,u.notify_email,u.notify_telegram,u.telegram_chat_id,u.holiday_profile
       FROM members m JOIN users u ON u.id=m.user_id
       WHERE m.event_id=? AND m.user_id=? AND m.status='approved'`,
      eid,
      targetUserId,
    );
    if (!targetMember)
      throw new HttpError("Partecipante non trovato nel gruppo.", 404);
    const targetHp = parseHolidayProfile(targetMember.holiday_profile);
    const correct =
      kind === "riddle_guess" && targetHp.riddleAnswer
        ? checkRiddleGuess(message, targetHp.riddleAnswer)
        : false;
    const interactionId = id();
    const createdAt = nowIso();
    const batch = [
      stmt(
        db,
        `INSERT INTO portrait_interactions(id,event_id,sender_id,receiver_id,kind,icon,message,correct,created_at)
         VALUES(?,?,?,?,?,?,?,?,?)`,
        interactionId,
        eid,
        user.id,
        targetUserId,
        kind,
        icon,
        message,
        correct ? 1 : 0,
        createdAt,
      ),
    ];
    if (targetUserId !== user.id && targetMember.notify_email) {
      const senderLabel = user.nickname || user.name;
      const subject =
        kind === "riddle_guess"
          ? `${senderLabel} ha provato il tuo indovinello in ${e.name}`
          : `${senderLabel} ti ha mandato un messaggio natalizio in ${e.name}`;
      const emoji = holidayIconMap.get(icon)?.emoji || "🎄";
      const html =
        kind === "riddle_guess"
          ? `<p><strong>${escapeHtml(senderLabel)}</strong> ha risposto al tuo indovinello del giorno in <strong>${escapeHtml(e.name)}</strong>: “${escapeHtml(message)}” ${correct ? "(Indovinato! 🎉)" : ""}.</p><p><a href="${escapeHtml(env.APP_URL || "")}/events/${eid}">Apri il gruppo</a></p>`
          : `<p>${emoji} <strong>${escapeHtml(senderLabel)}</strong> ti ha lasciato un pensiero natalizio in <strong>${escapeHtml(e.name)}</strong>: “${escapeHtml(message)}”.</p><p><a href="${escapeHtml(env.APP_URL || "")}/events/${eid}">Apri il gruppo</a></p>`;
      batch.push(
        stmt(
          db,
          "INSERT OR IGNORE INTO outbox(id,event_id,version,email,subject,html) VALUES(?,?,?,?,?,?)",
          interactionId,
          eid,
          -999,
          targetMember.email,
          subject,
          html,
        ),
      );
    }
    await db.batch(batch);
    if (
      targetUserId !== user.id &&
      targetMember.notify_telegram &&
      targetMember.telegram_chat_id &&
      telegramAvailable(env)
    ) {
      const senderLabel = user.nickname || user.name;
      const emoji = holidayIconMap.get(icon)?.emoji || "🎄";
      const text =
        kind === "riddle_guess"
          ? `🎄 ${senderLabel} ha risposto al tuo indovinello in ${e.name}: “${message}”${correct ? " (Indovinato! 🎉)" : ""}`
          : `${emoji} ${senderLabel} ti ha mandato un pensiero natalizio in ${e.name}: “${message}”`;
      try {
        await telegramMessage(env, targetMember.telegram_chat_id, text);
      } catch {
        // Non bloccare la risposta se Telegram non è raggiungibile.
      }
    }
    return json({
      ok: true,
      correct,
      hasAnswer: Boolean(targetHp.riddleAnswer),
      interaction: {
        id: interactionId,
        senderId: user.id,
        senderName: user.name,
        senderNickname: user.nickname || "",
        receiverId: targetUserId,
        receiverName: targetMember.name,
        kind,
        icon,
        message,
        correct,
        createdAt,
      },
    });
  }
  if (action === "wishlist" && method === "PUT") {
    if (!member || member.status !== "approved")
      throw new HttpError(
        "Aspetta che l’organizzatore confermi la tua iscrizione.",
        403,
      );
    if (!Array.isArray(body.items) || body.items.length > 30)
      throw new HttpError("Puoi lasciare fino a 30 desideri.");
    const types = [
      "object",
      "theme",
      "hint",
      "riddle",
      "avoid",
      "surprise",
      "preference",
    ];
    const items = body.items.map((x) => {
      if (!x || !types.includes(x.type))
        throw new HttpError("Scegli il tipo di desiderio.");
      return {
        id: id(),
        type: x.type,
        title: safeText(x.title, 150, true),
        description: safeText(x.description, 1500),
        url: safeUrl(x.url),
        hint: safeText(x.hint, 1000),
        answer: safeText(x.answer, 1000),
      };
    });
    await run(
      db,
      "UPDATE members SET wishlist=?,updated_at=? WHERE id=?",
      JSON.stringify(items),
      nowIso(),
      member.id,
    );
    return json({ ok: true });
  }
  if (!admin)
    throw new HttpError("Questa azione spetta all’organizzatore.", 403);
  if (action === "accounts" && method === "POST") {
    mutable(e);
    const name = safeText(body.name, 80, true),
      email = validEmail(body.email),
      phone = optionalPhone(body.phone),
      claim = token();
    const changed = await db.batch([
      stmt(
        db,
        "UPDATE events SET version=version+1,draw_token=?,error=NULL WHERE id=? AND version=? AND status='open' AND ((SELECT COUNT(*) FROM members WHERE event_id=? AND status!='removed')<50 OR EXISTS(SELECT 1 FROM members m JOIN users u ON u.id=m.user_id WHERE m.event_id=? AND m.status!='removed' AND u.email=?))",
        claim,
        eid,
        e.version,
        eid,
        eid,
        email,
      ),
      stmt(
        db,
        "INSERT INTO users(id,email,name,phone,notify_email) SELECT ?,?,?,?,1 WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=?) ON CONFLICT(email) DO NOTHING",
        id(),
        email,
        name,
        phone,
        eid,
        claim,
      ),
      stmt(
        db,
        "INSERT INTO members(id,event_id,user_id,status,updated_at) SELECT ?,?,u.id,'approved',? FROM users u WHERE u.email=? AND EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=?) ON CONFLICT(event_id,user_id) DO UPDATE SET status='approved',updated_at=excluded.updated_at",
        id(),
        eid,
        nowIso(),
        email,
        eid,
        claim,
      ),
      stmt(
        db,
        "INSERT INTO audit(id,event_id,actor_id,action,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=?)",
        id(),
        eid,
        user.id,
        "prepare_account",
        nowIso(),
        eid,
        claim,
      ),
    ]);
    if (!changed[0].meta.changes)
      throw new HttpError(
        "L’evento è cambiato o il gruppo è al completo.",
        409,
      );
    return json({ ok: true }, 201);
  }
  if (
    (action === "rename" && method === "POST") ||
    (action === "group" && (method === "PUT" || method === "POST"))
  ) {
    const hasName =
      Object.hasOwn(body, "name") && String(body.name ?? "").trim() !== "";
    const hasGroupName =
      Object.hasOwn(body, "groupName") &&
      String(body.groupName ?? "").trim() !== "";
    if (!hasName && !hasGroupName)
      throw new HttpError("Indica il nuovo nome del gruppo o dell’evento.");
    const nextName = hasName ? safeText(body.name, 100, true) : e.name;
    const nextGroupName = hasGroupName
      ? safeText(body.groupName, 100, true)
      : hasName && !Object.hasOwn(body, "groupName") && e.group_name === e.name
        ? nextName
        : e.group_name;
    await db.batch([
      stmt(
        db,
        "UPDATE groups SET name=? WHERE id=?",
        nextGroupName,
        e.group_id,
      ),
      stmt(db, "UPDATE events SET name=? WHERE id=?", nextName, eid),
      audit(db, eid, user.id, "rename"),
    ]);
    const updated = await first(
      db,
      "SELECT e.*,g.name AS group_name,(SELECT COUNT(*) FROM members x WHERE x.event_id=e.id AND x.status='approved') AS member_count FROM events e JOIN groups g ON g.id=e.group_id WHERE e.id=?",
      eid,
    );
    return json({
      ok: true,
      event: outputEvent(updated, user, updated.member_count),
    });
  }
  if (action === "" && method === "PUT") {
    mutable(e);
    if (!Number.isInteger(body.version) || body.version !== e.version)
      throw new HttpError(
        "L’evento è cambiato. Aggiorna la pagina e riprova.",
        409,
      );
    const name = safeText(body.name, 100, true),
      hasGroupName = Object.hasOwn(body, "groupName"),
      groupName = hasGroupName
        ? safeText(body.groupName, 100) || name
        : e.group_name === e.name
          ? name
          : e.group_name,
      description = safeText(body.description, 2000),
      budget = Number(body.budget),
      depth = body.historyDepth ?? e.history_depth;
    if (!Number.isFinite(budget) || budget < 0 || budget > 10000)
      throw new HttpError("Indica un budget compreso tra 0 e 10.000 euro.");
    if (!Number.isInteger(depth) || depth < 0 || depth > 10)
      throw new HttpError("Scegli da 0 a 10 edizioni precedenti da escludere.");
    const [close, draw, gift] = dates(body),
      claim = token();
    const result = await db.batch([
      stmt(
        db,
        "UPDATE events SET name=?,description=?,budget=?,close_at=?,draw_at=?,gift_at=?,history_depth=?,version=version+1,draw_token=?,error=NULL WHERE id=? AND version=? AND status='open'",
        name,
        description,
        budget,
        close,
        draw,
        gift,
        depth,
        claim,
        eid,
        body.version,
      ),
      stmt(
        db,
        "UPDATE groups SET name=? WHERE id=? AND EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=?)",
        groupName,
        e.group_id,
        eid,
        claim,
      ),
      stmt(
        db,
        "INSERT INTO audit(id,event_id,actor_id,action,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=?)",
        id(),
        eid,
        user.id,
        "edit",
        nowIso(),
        eid,
        claim,
      ),
    ]);
    if (!result[0].meta.changes)
      throw new HttpError(
        "L’evento è cambiato. Aggiorna la pagina e riprova.",
        409,
      );
    return json({
      event: outputEvent(
        await first(
          db,
          "SELECT e.*,g.name AS group_name FROM events e JOIN groups g ON g.id=e.group_id WHERE e.id=?",
          eid,
        ),
        user,
      ),
    });
  }
  if (action.startsWith("members/") && method === "POST") {
    mutable(e);
    const mid = action.split("/")[1];
    if (!["approved", "removed"].includes(body.status))
      throw new HttpError("Scegli uno stato valido.");
    const target = await first(
      db,
      "SELECT id FROM members WHERE id=? AND event_id=?",
      mid,
      eid,
    );
    if (!target) throw new HttpError("Partecipante non trovato.", 404);
    const claim = token();
    const changed = await db.batch([
      stmt(
        db,
        "UPDATE events SET version=version+1,draw_token=?,error=NULL WHERE id=? AND status='open' AND version=?",
        claim,
        eid,
        e.version,
      ),
      stmt(
        db,
        "UPDATE members SET status=? WHERE id=? AND event_id=? AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='open' AND draw_token=?)",
        body.status,
        mid,
        eid,
        eid,
        claim,
      ),
      stmt(
        db,
        "DELETE FROM rules WHERE event_id=? AND (giver_id=? OR receiver_id=?) AND ?='removed' AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='open' AND draw_token=?)",
        eid,
        mid,
        mid,
        body.status,
        eid,
        claim,
      ),
    ]);
    if (!changed[0].meta.changes)
      throw new HttpError(
        "L’evento è cambiato. Aggiorna la pagina e riprova.",
        409,
      );
    return json({ ok: true });
  }
  if (action === "rules" && method === "PUT") {
    mutable(e);
    if (!Array.isArray(body.rules) || body.rules.length > 2500)
      throw new HttpError("L’elenco delle regole non è valido.");
    const members = await all(
        db,
        "SELECT id FROM members WHERE event_id=? AND status='approved'",
        eid,
      ),
      ids = new Set(members.map((m) => m.id));
    const rules = body.rules.map((r) => {
      if (
        !ids.has(r.giverId) ||
        !ids.has(r.receiverId) ||
        !["fixed", "exclude"].includes(r.type)
      )
        throw new HttpError(
          "Una regola contiene un partecipante non confermato.",
        );
      return r;
    });
    const claim = token();
    const changed = await db.batch([
      stmt(
        db,
        "UPDATE events SET version=version+1,draw_token=?,error=NULL WHERE id=? AND status='open' AND version=?",
        claim,
        eid,
        e.version,
      ),
      stmt(
        db,
        "DELETE FROM rules WHERE event_id=? AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='open' AND draw_token=?)",
        eid,
        eid,
        claim,
      ),
      ...rules.map((r) =>
        stmt(
          db,
          "INSERT OR IGNORE INTO rules(event_id,giver_id,receiver_id,type) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND status='open' AND draw_token=?)",
          eid,
          r.giverId,
          r.receiverId,
          r.type,
          eid,
          claim,
        ),
      ),
    ]);
    if (!changed[0].meta.changes)
      throw new HttpError(
        "L’evento è cambiato. Aggiorna la pagina e riprova.",
        409,
      );
    return json({ ok: true });
  }
  if (action === "draw" && method === "POST") {
    await drawEvent(env, e, user.id);
    return json({ ok: true });
  }
  if (action === "cancel" && method === "POST") {
    if (
      e.status !== "drawn" ||
      !Number.isInteger(body.version) ||
      body.version !== e.version
    )
      throw new HttpError(
        "L’estrazione è cambiata. Aggiorna la pagina prima di annullarla.",
        409,
      );
    safeText(body.reason, 500, true);
    const claim = token(),
      result = await db.batch([
        stmt(
          db,
          "UPDATE events SET status='open',version=version+1,draw_token=?,error='Estrazione annullata. Controlla le regole e avviala di nuovo quando il gruppo è pronto.' WHERE id=? AND status='drawn' AND version=?",
          claim,
          eid,
          body.version,
        ),
        stmt(
          db,
          "UPDATE outbox SET state='cancelled' WHERE event_id=? AND state='queued' AND EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=?)",
          eid,
          eid,
          claim,
        ),
        stmt(
          db,
          "INSERT INTO audit(id,event_id,actor_id,action,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=?)",
          id(),
          eid,
          user.id,
          `cancel: ${safeText(body.reason, 500)}`,
          nowIso(),
          eid,
          claim,
        ),
      ]);
    if (!result[0].meta.changes)
      throw new HttpError(
        "L’estrazione è cambiata. Aggiorna la pagina prima di annullarla.",
        409,
      );
    return json({ ok: true });
  }
  if (action === "archive" && method === "POST") {
    await archiveCompetition(db, eid);
    return json({ ok: true });
  }
  if (action === "rotate-invite" && method === "POST") {
    mutable(e);
    const t = token();
    await db.batch([
      stmt(db, "UPDATE events SET invite_token=? WHERE id=?", t, eid),
      stmt(
        db,
        "UPDATE invites SET token=NULL,state='revoked' WHERE event_id=?",
        eid,
      ),
      stmt(
        db,
        "UPDATE outbox SET state='cancelled' WHERE event_id=? AND state='queued' AND subject LIKE 'Ti aspettiamo%'",
        eid,
      ),
    ]);
    return json({ token: t });
  }
  if (action === "invites" && method === "POST") {
    mutable(e);
    if (!Array.isArray(body.emails) || body.emails.length > 50)
      throw new HttpError("Invia al massimo 50 inviti alla volta.");
    if (!env.RESEND_API_KEY || !env.MAIL_FROM)
      throw new HttpError(
        "L’invio email non è configurato. Puoi copiare il testo dell’invito e condividerlo tu.",
        503,
      );
    const emails = [...new Set(body.emails.map(validEmail))],
      batch = [];
    for (const email of emails) {
      const invitation = id(),
        individualToken = token();
      batch.push(
        stmt(
          db,
          "INSERT INTO invites(id,event_id,email,state,created_at,token,generation) VALUES(?,?,?,'queued',?,?,1) ON CONFLICT(event_id,email) DO UPDATE SET state='queued',created_at=excluded.created_at,token=excluded.token,generation=invites.generation+1 WHERE invites.state IN ('revoked','failed')",
          invitation,
          eid,
          email,
          nowIso(),
          individualToken,
        ),
      );
      batch.push(
        stmt(
          db,
          "INSERT OR IGNORE INTO outbox(id,event_id,version,email,subject,html) SELECT ?,?,-i.generation,?,?,? FROM invites i WHERE i.event_id=? AND i.token=?",
          id(),
          eid,
          email,
          `Ti aspettiamo per ${e.name}`,
          `<p>${escapeHtml(user.name)} ti invita a <strong>${escapeHtml(e.name)}</strong>.</p><p>Il budget è ${e.budget} €. Iscrizioni entro il ${escapeHtml(e.close_at.slice(0, 10))}.</p><p><a href="${escapeHtml(env.APP_URL || "")}/invite/${individualToken}">Leggi l’invito e partecipa</a>.</p><p>L’organizzatore può conoscere gli abbinamenti.</p>`,
          eid,
          individualToken,
        ),
      );
    }
    const result = await db.batch(batch);
    return json({
      ok: true,
      queued: result
        .filter((_, i) => i % 2 === 0)
        .reduce((n, r) => n + r.meta.changes, 0),
    });
  }
  if (action === "clear-history" && method === "POST") {
    mutable(e);
    const claim = token(),
      result = await db.batch([
        stmt(
          db,
          "UPDATE events SET version=version+1,draw_token=?,error=NULL WHERE id=? AND version=? AND status='open'",
          claim,
          eid,
          e.version,
        ),
        stmt(
          db,
          "DELETE FROM history WHERE group_id=? AND EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=?)",
          e.group_id,
          eid,
          claim,
        ),
      ]);
    if (!result[0].meta.changes)
      throw new HttpError(
        "L’evento è cambiato. Aggiorna la pagina e riprova.",
        409,
      );
    return json({ ok: true });
  }
  if (action === "history" && method === "POST") {
    mutable(e);
    if (!Array.isArray(body.pairs) || body.pairs.length > 500)
      throw new HttpError("Puoi importare fino a 500 coppie alla volta.");
    const pairs = body.pairs.map((p) => ({
      giverEmail: validEmail(p.giverEmail),
      receiverEmail: validEmail(p.receiverEmail),
    }));
    const claim = token(),
      result = await db.batch([
        stmt(
          db,
          "UPDATE events SET version=version+1,draw_token=?,error=NULL WHERE id=? AND version=? AND status='open'",
          claim,
          eid,
          e.version,
        ),
        ...pairs.map((p) =>
          stmt(
            db,
            "INSERT INTO history(id,group_id,giver_email,receiver_email) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND draw_token=? AND status='open')",
            id(),
            e.group_id,
            p.giverEmail,
            p.receiverEmail,
            eid,
            claim,
          ),
        ),
      ]);
    if (!result[0].meta.changes)
      throw new HttpError(
        "L’evento è cambiato. Aggiorna la pagina e riprova.",
        409,
      );
    return json({ ok: true });
  }
  if (action === "duplicate" && method === "POST") {
    const year = 365 * 86400000,
      shift = (d) => new Date(new Date(d).valueOf() + year).toISOString();
    const copy = await createEvent(
      db,
      user,
      {
        name: body.name || `${e.name} — nuova edizione`,
        budget: e.budget,
        description: e.description,
        groupName: e.group_name,
        historyDepth: e.history_depth,
        closeAt: shift(e.close_at),
        drawAt: shift(e.draw_at),
        giftAt: shift(e.gift_at),
      },
      e.group_id,
    );
    return json({ event: outputEvent(copy, user, 0) }, 201);
  }
  throw new HttpError("Questa azione non è disponibile.", 404);
}
export async function inviteRoute(env, t, user) {
  const e = await first(
    env.DB,
    "SELECT e.*,u.name AS organizer_name FROM events e JOIN users u ON u.id=e.owner_id WHERE e.invite_token=? OR EXISTS(SELECT 1 FROM invites i WHERE i.event_id=e.id AND i.token=?)",
    t,
    t,
  );
  if (!e)
    throw new HttpError("Questo invito è scaduto o è stato revocato.", 404);
  const member =
    user &&
    (await first(
      env.DB,
      "SELECT status FROM members WHERE event_id=? AND user_id=? AND status!='removed'",
      e.id,
      user.id,
    ));
  const closed =
    e.status !== "open" || new Date(e.close_at).valueOf() <= Date.now();
  const isOwner = e.owner_id === user?.id;
  if (closed && !user)
    return json({
      event: null,
      membership: null,
      closed: true,
      requiresSignIn: true,
    });
  if (closed && !member && !isOwner)
    throw new HttpError("Questo invito è scaduto o è stato revocato.", 404);
  return json({
    event: {
      id: e.id,
      name: e.name,
      budget: e.budget,
      drawAt: e.draw_at,
      giftAt: e.gift_at,
      description: e.description,
    },
    organizerName: e.organizer_name,
    membership: member?.status ?? null,
    isOwner,
    closed,
  });
}
export async function scheduled(env) {
  const due = await all(
    env.DB,
    "SELECT * FROM events WHERE status='open' AND draw_at<=? AND error IS NULL LIMIT 10",
    nowIso(),
  );
  for (const e of due)
    try {
      await drawEvent(env, e);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status >= 500) {
        console.error(
          "L’estrazione programmata verrà ritentata.",
          e.id,
          error?.name,
        );
        continue;
      }
      if (error.status === 409) continue;
      await run(
        env.DB,
        "UPDATE events SET error=? WHERE id=? AND version=?",
        error.message,
        e.id,
        e.version,
      );
    }
  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    await run(
      env.DB,
      "UPDATE outbox SET state='queued' WHERE state='sending' AND last_attempt<?",
      Date.now() - 300000,
    );
    const mails = await all(
      env.DB,
      "SELECT * FROM outbox WHERE state='queued' AND next_at<=? AND attempts<5 LIMIT 5",
      Date.now(),
    );
    for (const mail of mails) {
      const claim = await run(
        env.DB,
        "UPDATE outbox SET state='sending',last_attempt=? WHERE id=? AND state='queued'",
        Date.now(),
        mail.id,
      );
      if (claim.meta.changes !== 1) continue;
      if (
        mail.version >= 0 &&
        !(await first(
          env.DB,
          "SELECT 1 FROM events e JOIN members m ON m.event_id=e.id JOIN users u ON u.id=m.user_id WHERE e.id=? AND e.version=? AND e.status='drawn' AND m.status='approved' AND u.email=? AND u.notify_email=1 AND EXISTS(SELECT 1 FROM assignments a WHERE a.event_id=e.id AND a.version=e.version AND a.giver_id=m.id)",
          mail.event_id,
          mail.version,
          mail.email,
        ))
      ) {
        await run(
          env.DB,
          "UPDATE outbox SET state='cancelled' WHERE id=?",
          mail.id,
        );
        continue;
      }
      try {
        await sendMail(env, mail.email, mail.subject, mail.html, mail.id);
        await run(
          env.DB,
          "UPDATE outbox SET state='sent',error=NULL WHERE id=?",
          mail.id,
        );
        if (mail.version < 0)
          await run(
            env.DB,
            "UPDATE invites SET state='sent' WHERE event_id=? AND email=? AND generation=?",
            mail.event_id,
            mail.email,
            -mail.version,
          );
      } catch (error) {
        const state = mail.attempts >= 4 ? "failed" : "queued";
        await run(
          env.DB,
          "UPDATE outbox SET state=?,attempts=attempts+1,next_at=?,error=? WHERE id=?",
          state,
          Date.now() + 60000 * Math.pow(2, mail.attempts),
          error.message,
          mail.id,
        );
        if (mail.version < 0)
          await run(
            env.DB,
            "UPDATE invites SET state=? WHERE event_id=? AND email=? AND generation=?",
            state,
            mail.event_id,
            mail.email,
            -mail.version,
          );
      }
    }
  }
  await run(env.DB, "DELETE FROM sessions WHERE expires<?", Date.now());
  await run(env.DB, "DELETE FROM auth_limits WHERE expires<?", Date.now());
  await run(env.DB, "DELETE FROM codes WHERE expires<?", Date.now());
}
