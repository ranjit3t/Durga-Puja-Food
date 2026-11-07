import { ChatMessage } from "../domain";
import { getChatSummaries } from "../utils/chatSummaries";

function message(
  id: string,
  sender: string,
  recipient: string,
  timestamp: number,
  text: string,
): ChatMessage {
  return {
    id,
    chatId: "admin__vendor",
    sender,
    senderName: sender,
    recipient,
    text,
    timestamp,
    status: "sent",
  };
}

describe("getChatSummaries", () => {
  it("omits a cleared conversation from the last-message and unread summaries", () => {
    const { unreadMap, lastMsgMap } = getChatSummaries({
      admin__vendor: {
        messages: {
          old: message("old", "vendor", "admin", 100, "Old vendor message"),
        },
        clearedAt: { admin: 101 },
      },
    }, "admin");

    expect(lastMsgMap.vendor).toBeUndefined();
    expect(unreadMap.vendor).toBeUndefined();
  });

  it("only includes chats where the current user is an exact participant", () => {
    const { lastMsgMap } = getChatSummaries({
      admin__vendor: {
        messages: {
          relevant: message("relevant", "vendor", "admin", 100, "Vendor message"),
        },
      },
      superadmin__caterer: {
        messages: {
          unrelated: message("unrelated", "caterer", "superadmin", 200, "Other chat"),
        },
      },
    }, "admin");

    expect(lastMsgMap.vendor?.text).toBe("Vendor message");
    expect(lastMsgMap.caterer).toBeUndefined();
  });
});
