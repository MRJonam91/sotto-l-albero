import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";

it("attiva una volta le email esistenti senza cambiare Telegram o future disattivazioni", () => {
  const sql = new DatabaseSync(":memory:");
  const directory = new URL("../migrations/", import.meta.url);
  for (const name of readdirSync(directory)
    .filter((name) => name.endsWith(".sql") && name < "0015_")
    .sort()) {
    sql.exec(readFileSync(new URL(name, directory), "utf8"));
  }
  sql.exec(`
    INSERT INTO users(id,email,name,notify_email,notify_telegram,telegram_chat_id)
    VALUES ('existing-off','off@example.test','Off',0,0,NULL),
           ('existing-on','on@example.test','On',1,1,'test-chat');
    INSERT INTO groups(id,owner_id,name) VALUES ('group','existing-off','Gruppo');
    INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at)
    VALUES ('event','existing-off','group','Festa',20,'','2026-12-01','2026-12-02','2026-12-25','test-token','2026-11-16');
    INSERT INTO members(id,event_id,user_id,status,updated_at)
    VALUES ('member','event','existing-off','approved','2026-11-16');
    INSERT INTO assignments(event_id,version,giver_id,receiver_id)
    VALUES ('event',1,'existing-off','existing-on');
  `);
  const before = {
    members: sql.prepare("SELECT * FROM members").all(),
    assignments: sql.prepare("SELECT * FROM assignments").all(),
    events: sql.prepare("SELECT * FROM events").all(),
  };
  sql.exec(
    readFileSync(
      new URL("0015_existing_email_notifications.sql", directory),
      "utf8",
    ),
  );
  expect(
    sql
      .prepare(
        "SELECT id,notify_email,notify_telegram,telegram_chat_id FROM users ORDER BY id",
      )
      .all(),
  ).toEqual([
    {
      id: "existing-off",
      notify_email: 1,
      notify_telegram: 0,
      telegram_chat_id: null,
    },
    {
      id: "existing-on",
      notify_email: 1,
      notify_telegram: 1,
      telegram_chat_id: "test-chat",
    },
  ]);
  for (const table of ["members", "assignments", "events"])
    expect(sql.prepare(`SELECT * FROM ${table}`).all()).toEqual(before[table]);
  // A migration changes today's defaults once, without a trigger forcing opt-in.
  sql.exec("UPDATE users SET notify_email=0 WHERE id='existing-off'");
  expect(
    sql.prepare("SELECT notify_email FROM users WHERE id='existing-off'").get()
      .notify_email,
  ).toBe(0);
  sql.close();
});
